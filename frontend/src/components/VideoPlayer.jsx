import React, { useEffect, useRef } from 'react';
import shaka from 'shaka-player';
import '../styles/VideoPlayer.css';

const VideoPlayer = ({ video, onClose, onDownload }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    // Ensure shaka player is not already initialized
    if (!shaka.Player.isBrowserSupported()) {
      console.error('Browser does not support Shaka Player');
      return;
    }

    const initPlayer = async () => {
      try {
        const player = new shaka.Player(videoRef.current);
        playerRef.current = player;

        // Listen to errors
        player.addEventListener('error', onPlayerError);

        // Load the video
        if (video.videoUrl) {
          console.log('[PLAYER] Loading video:', video.videoUrl);
          await player.load(video.videoUrl);
          console.log('[PLAYER] Video loaded successfully');
          
          // Auto-play
          videoRef.current.play().catch(err => {
            console.warn('[PLAYER] Autoplay failed:', err);
          });
        }
      } catch (error) {
        console.error('[PLAYER] Error initializing Shaka Player:', error);
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [video.videoUrl]);

  const onPlayerError = (event) => {
    console.error('[PLAYER] Error code', event.detail.code, 'object', event.detail.error);
  };

  return (
    <div className="video-player-overlay" onClick={onClose}>
      <div className="video-player-container" onClick={(e) => e.stopPropagation()}>
        <div className="player-header">
          <h2>{video.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="player-wrapper">
          <video
            ref={videoRef}
            className="shaka-video"
            controls
            controlsList="nodownload"
            width="100%"
            height="100%"
            poster={video.thumbnailUrl || ''}
          />
        </div>

        <div className="player-info">
          <p className="description">{video.description}</p>
          
          {video.tags && video.tags.length > 0 && (
            <div className="tags-section">
              <strong>Tags:</strong>
              <div className="tags-list">
                {video.tags.map((tag, idx) => (
                  <span key={idx} className="tag-badge">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

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
