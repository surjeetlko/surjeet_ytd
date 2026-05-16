import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playlistData, setPlaylistData] = useState(null);

  const fetchVideoInfo = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const isPlaylist = url.includes('list=');
      const endpoint = isPlaylist ? '/get-playlist-info' : '/get-video-info';

      const response = await axios.post(
        `https://crown-ahoy-job.ngrok-free.dev${endpoint}`,
        { url },
        {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );
      
      if (isPlaylist) {
        if (response.data.error) throw new Error(response.data.error);
        setPlaylistData(response.data);
        setVideoData(null); // Hide single video UI
      } else {
        setVideoData(response.data);
        setPlaylistData(null); // Hide playlist UI
      }
    } catch (error) {
      alert("Error fetching video details. URL check karein.");
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <> {/* YEH FRAGMENT ADD KIYA GAYA HAI */}
      
      {/* Playlist Display Section */}
      {playlistData && (
        <div className="mt-8 p-6 bg-gray-800 rounded-lg text-white">
          <h2 className="text-2xl font-bold mb-2">{playlistData.playlist_title}</h2>
          <p className="text-gray-400 mb-6">Total Videos: {playlistData.total_videos}</p>
          
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
            {playlistData.videos.map((video) => (
              <div key={video.id} className="flex justify-between items-center bg-gray-700 p-4 rounded-md">
                <span className="truncate pr-4 w-3/4 text-sm">{video.title}</span>
                
                <button 
                  onClick={() => {
                    // This sets the main input to this specific video and clears the list
                    setUrl(video.url); 
                    setPlaylistData(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium text-sm transition-colors"
                >
                  Get Video
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="main-app-container">
        <h1>Advanced YouTube Downloader</h1>
        
        <div className="input-bar-group">
          <input 
            type="text" 
            placeholder="Yahan YouTube video link paste karein..." 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
          />
          <button onClick={fetchVideoInfo} disabled={loading}>
            {loading ? 'Searching...' : 'Get Video'}
          </button>
        </div>

        {videoData && (
          <div className="video-card-container">
            <img src={videoData.thumbnail} alt="Thumbnail" />
            <h3 className="video-title">{videoData.title}</h3>
            
            <div className="all-download-options">
              {/* Video + Audio Section */}
              {videoData.video_audio.length > 0 && (
                <div className="quality-section">
                  <h4>🎥 Video + Audio (Ready to Play)</h4>
                  {videoData.video_audio.map((format, index) => (
                    <div key={`va-${index}`} className="download-wrapper-line"> 
                      <a href={format.url} target="_blank" rel="noopener noreferrer" className="download-pill green-pill">
                        Download {format.resolution} ({format.ext})
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Audio Only Section */}
              {videoData.audio_only.length > 0 && (
                <div className="quality-section">
                  <h4>🎵 Audio Only (Music/Podcast)</h4>
                  {videoData.audio_only.map((format, index) => (
                    <div key={`a-${index}`} className="download-wrapper-line">
                      <a href={format.url} target="_blank" rel="noopener noreferrer" className="download-pill blue-pill">
                        Audio Format ({format.ext})
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* High Quality Video Only Section */}
              {videoData.video_only.length > 0 && (
                <div className="quality-section">
                  <h4>🔕 High Quality Video (No Audio)</h4>
                  {videoData.video_only.map((format, index) => (
                    <div key={`vo-${index}`} className="download-wrapper-line">
                      <a href={format.url} target="_blank" rel="noopener noreferrer" className="download-pill orange-pill">
                        Video Only {format.resolution} ({format.ext})
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </> 
  );
}

export default App;