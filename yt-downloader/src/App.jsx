import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playlistData, setPlaylistData] = useState(null);
  
  // New state to track progress of individual playlist items
  const [itemProgress, setItemProgress] = useState({});

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
          headers: { 'ngrok-skip-browser-warning': 'true' }
        }
      );
      
      if (isPlaylist) {
        if (response.data.error) throw new Error(response.data.error);
        setPlaylistData(response.data);
        setVideoData(null);
      } else {
        setVideoData(response.data);
        setPlaylistData(null);
      }
    } catch (error) {
      alert("Error fetching details. URL check karein.");
      console.error(error);
    }
    setLoading(false);
  };

  // Function to handle inline download with progress bar simulation
  const downloadInlineVideo = async (videoUrl, videoId) => {
    // Start progress simulation
    setItemProgress(prev => ({ ...prev, [videoId]: 10 }));
    
    const progressInterval = setInterval(() => {
      setItemProgress(prev => {
        const currentProgress = prev[videoId] || 10;
        if (currentProgress >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return { ...prev, [videoId]: currentProgress + 15 };
      });
    }, 200);

    try {
      const response = await axios.post(
        'https://crown-ahoy-job.ngrok-free.dev/get-video-info',
        { url: videoUrl },
        {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        }
      );

      clearInterval(progressInterval);

      if (response.data && response.data.video_audio && response.data.video_audio.length > 0) {
        // Set to 100% on success
        setItemProgress(prev => ({ ...prev, [videoId]: 100 }));
        
        // Get the best quality Video+Audio link
        const downloadUrl = response.data.video_audio[0].url;
        
        // Trigger automatic browser download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clear progress bar after 2 seconds
        setTimeout(() => {
          setItemProgress(prev => {
            const newState = { ...prev };
            delete newState[videoId];
            return newState;
          });
        }, 200);
      } else {
        alert("Download link nahi mil paya.");
        clearInterval(progressInterval);
        setItemProgress(prev => ({ ...prev, [videoId]: 0 }));
      }
    } catch (error) {
      console.error(error);
      clearInterval(progressInterval);
      setItemProgress(prev => ({ ...prev, [videoId]: 0 }));
      alert("Is video ko process karne mein error aayi.");
    }
  };

  return (
    <>
      {/* Playlist Display Section */}
      {playlistData && (
        <div className="mt-8 p-6 bg-gray-800 rounded-lg text-white max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-center">{playlistData.playlist_title}</h2>
          <p className="text-gray-400 mb-6 text-center">Total Videos: {playlistData.total_videos}</p>
          
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
            {playlistData.videos.map((video) => {
              const progress = itemProgress[video.id];
              const isProcessing = progress > 0;

              return (
                <div key={video.id} className="flex flex-col bg-gray-700 p-4 rounded-md relative overflow-hidden">
                  <div className="flex justify-between items-center z-10">
                    <span className="truncate pr-4 w-3/4 text-sm font-medium">{video.title}</span>
                    
                    <button 
                      onClick={() => downloadInlineVideo(video.url, video.id)}
                      disabled={isProcessing}
                      className={`${
                        isProcessing ? 'bg-gray-500' : 'bg-red-600 hover:bg-red-700'
                      } px-4 py-2 rounded font-medium text-sm transition-colors text-white min-w-[100px]`}
                    >
                      {isProcessing ? (progress === 100 ? 'Done!' : 'Processing...') : 'Get Video'}
                    </button>
                  </div>

                  {/* Inline Progress Bar Renderer */}
                  {isProcessing && (
                    <div className="w-full bg-gray-600 h-1.5 mt-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-500 h-full transition-all duration-200" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="main-app-container">
        <h1>Advanced YouTube Downloader</h1>
        
        <div className="input-bar-group">
          <input 
            type="text" 
            placeholder="Yahan YouTube video ya playlist link paste karein..." 
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
              {videoData.video_only.length > 0 && (
                <div className="quality-section">
                  <h4>🌟 High Quality Video (Merged Video + Audio)</h4>
                  <div className="download-wrapper-line">
                    <a 
                      href={`https://crown-ahoy-job.ngrok-free.dev/download-merged?url=${encodeURIComponent(url)}&title=${encodeURIComponent(videoData.title || "youtube_video")}`} 
                      className="download-pill orange-pill"
                    >
                      Download Full HD (Takes 10-20 sec)
                    </a>
                  </div>
                </div>
              )}

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