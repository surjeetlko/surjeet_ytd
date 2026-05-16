import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchVideoInfo = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const response = await axios.post('   https://wjlkv-125-18-144-2.run.pinggy-free.link/get-video-info', { url });
      setVideoData(response.data);
    } catch (error) {
      alert("Error fetching video details. URL check karein.");
      console.error(error);
    }
    setLoading(false);
  };

  return (
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
                  <div key={`va-${index}`} className="download-wrapper-line"> {/* Separate line link wrapper */}
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
  );
}

export default App;
