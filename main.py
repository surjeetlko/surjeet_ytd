import os
import uuid
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
import yt_dlp
from pydantic import BaseModel
import requests
from typing import Optional


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp folder jahan merged files download hongi, phir serve karke delete ho jayengi
DOWNLOAD_DIR = "temp_downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


class VideoRequest(BaseModel):
    url: str


def cleanup_file(path: str):
    """Response bhejne ke baad temp file delete karo, taaki disk fill na ho"""
    try:
        os.remove(path)
    except Exception:
        pass


@app.post("/get-video-info")
async def get_video_info(request: VideoRequest):
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'cookiefile': 'cookies.txt',
        'extractor_args': {
            'youtube': {
                'client': ['web', 'android', 'ios']  # <-- YEH HAI MAGIC TRICK
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)

            video_audio_dict = {}
            audio_only_dict = {}
            video_only_dict = {}

            for f in info.get('formats', []):
                protocol = f.get('protocol')
                if protocol and ('m3u8' in protocol or 'dash' in protocol):
                    continue

                vcodec = f.get('vcodec')
                acodec = f.get('acodec')
                ext = f.get('ext')
                height = f.get('height') or 0
                res = f.get('resolution', 'Unknown')
                url = f.get('url')

                if vcodec == 'none' and acodec != 'none':
                    if ext not in audio_only_dict or ext == 'm4a':
                        audio_only_dict[ext] = {'ext': ext, 'url': url}

                elif vcodec != 'none' and acodec != 'none':
                    if res not in video_audio_dict or ext == 'mp4':
                        video_audio_dict[res] = {'resolution': res, 'ext': ext, 'url': url, 'height': height}

                elif vcodec != 'none' and acodec == 'none':
                    if height >= 720:
                        if height not in video_only_dict or ext == 'mp4':
                            video_only_dict[height] = {'resolution': res, 'ext': ext, 'url': url, 'height': height}

            video_audio = sorted(list(video_audio_dict.values()), key=lambda x: x.get('height', 0), reverse=True)
            video_only = sorted(list(video_only_dict.values()), key=lambda x: x.get('height', 0), reverse=True)
            audio_only = list(audio_only_dict.values())

            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "video_audio": video_audio,
                "video_only": video_only,   # frontend: in options ko "/download-merged" endpoint se call karo
                "audio_only": audio_only
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/get-playlist-info")
async def get_playlist_info(request: Request):
    data = await request.json()
    url = data.get("url")

    ydl_opts = {
        'extract_flat': True,
        'quiet': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            if 'entries' not in info:
                return {"error": "No playlist entries found. Please check the URL."}

            videos = []
            for entry in info['entries']:
                if entry:
                    videos.append({
                        "id": entry.get("id"),
                        "title": entry.get("title"),
                        "url": entry.get("url"),
                        "duration": entry.get("duration")
                    })

            return {
                "playlist_title": info.get("title"),
                "total_videos": len(videos),
                "videos": videos
            }

    except Exception as e:
        return {"error": str(e)}


# ==========================================
# EXISTING PROXY ENDPOINT (single direct-url streams: audio_only / video_only)
# ==========================================
@app.get("/proxy-download")
def proxy_download(url: str, title: str = "downloaded_video"):
    def iterfile():
        with requests.get(url, stream=True) as r:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk

    safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c == ' ']).rstrip()
    headers = {
        "Content-Disposition": f'attachment; filename="{safe_title}.mp4"'
    }

    return StreamingResponse(iterfile(), media_type="video/mp4", headers=headers)


# ==========================================
# NAYA ENDPOINT: combined video+audio HD download (server-side merge via ffmpeg)
# ==========================================
@app.get("/download-merged")
# def download_merged(url: str, height: int, title: str = "video", background_tasks: BackgroundTasks = None):
async def download_merged(url: str, title: str = "youtube_video", background_tasks: BackgroundTasks = BackgroundTasks()):    
    """
    Frontend ke 'Video Only' buttons ab isko call karein (url + height ke saath).
    yt-dlp bestvideo (<=height) + bestaudio ko fetch karke ffmpeg se merge karega,
    fir merged mp4 seedha response mein bhej denge aur temp file delete ho jayegi.
    """
    safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
    if not safe_title:
        safe_title = "downloaded_video"
    
    output_filename = f"{safe_title}.mp4"
    
    # Yahan koi height ya extra filter nahi hona chahiye
    ydl_opts_merge = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': output_filename,
        'cookiefile': 'cookies.txt',
        'quiet': True,
        'merge_output_format': 'mp4'
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts_merge) as ydl:
            ydl.download([url])
            
        def remove_file(path: str):
            if os.path.exists(path):
                os.remove(path)
                
        background_tasks.add_task(remove_file, output_filename)
        
        return FileResponse(path=output_filename, filename=output_filename, media_type='video/mp4')
        
    except Exception as e:
        return {"error": f"Failed to process video: {str(e)}"}