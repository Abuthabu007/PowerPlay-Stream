import React from 'react';
import ReactPlayer from 'react-player';
import '../styles/VideoPlayer.css';

const VideoPlayer = ({ video, onClose, onDownload }) => {
  return (
    <div className="video-player-overlay" onClick={onClose}>
      <div className="video-player-container" onClick={(e) => e.stopPropagation()}>
        <div className="player-header">
          <h2>{video.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="player-wrapper">
          <ReactPlayer
            url={video.videoUrl}
            controls
            width="100%"
            height="100%"
            playing
          />
        </div>

        <div className="player-info">
          <p className="description">{video.description}</p>
          
          {video.Captions && video.Captions.length > 0 && (
            <div className="captions-available">
              <strong>Available Captions:</strong>
              {video.Captions.map(caption => (
                <span key={caption.id} className="caption-badge">
                  {caption.language}
                </span>
              ))}
            </div>
          )}

          <div className="player-actions">
            <button className="btn-primary" onClick={() => onDownload(video.id)}>
              {video.isDownloaded ? '✓ Downloaded' : 'Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
