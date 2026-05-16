from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    url: str

@app.post("/get-video-info")
async def get_video_info(request: VideoRequest):
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'cookiefile': 'cookies.txt',
        'extractor_args': {
            'youtube': {
                'client': ['android', 'ios'] # <-- YEH HAI MAGIC TRICK
            }
        }
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            
            # Dictionary use kar rahe hain taki duplicates (mp4 aur webm) ko hata sakein
            video_audio_dict = {}
            audio_only_dict = {}
            video_only_dict = {}
            
            for f in info.get('formats', []):
                vcodec = f.get('vcodec')
                acodec = f.get('acodec')
                ext = f.get('ext')
                height = f.get('height') or 0
                res = f.get('resolution', 'Unknown')
                url = f.get('url')

                # 1. Sirf Audio (Music ke liye, m4a prefer karenge)
                if vcodec == 'none' and acodec != 'none':
                    if ext not in audio_only_dict or ext == 'm4a':
                        audio_only_dict[ext] = {'ext': ext, 'url': url}
                        
                # 2. Video + Audio (Combined - Normal qualities)
                elif vcodec != 'none' and acodec != 'none':
                    if res not in video_audio_dict or ext == 'mp4':
                        video_audio_dict[res] = {'resolution': res, 'ext': ext, 'url': url, 'height': height}
                        
                # 3. Sirf Video (High Quality 720p, 1080p, 4K)
                elif vcodec != 'none' and acodec == 'none':
                    if height >= 720: # Sirf 720p aur usse upar ki quality
                        if height not in video_only_dict or ext == 'mp4':
                            video_only_dict[height] = {'resolution': res, 'ext': ext, 'url': url, 'height': height}
            
            # Dictionaries ko wapas list mein badal kar High to Low height me sort karna
            video_audio = sorted(list(video_audio_dict.values()), key=lambda x: x.get('height', 0), reverse=True)
            video_only = sorted(list(video_only_dict.values()), key=lambda x: x.get('height', 0), reverse=True)
            audio_only = list(audio_only_dict.values())
            
            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "video_audio": video_audio,
                "video_only": video_only,
                "audio_only": audio_only
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
