import React, { useEffect, useState } from 'react';
import '../styles/VideoCard.css';

const VideoCard = ({ video, onPlay, onDownload, onDelete, onPrivacy, currentUserId, userRole }) => {
  const isOwner = video.userId === currentUserId;
  
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
      onDelete(video.id, 'soft');
    }
  };

  const handlePermanentDelete = () => {
    if (userRole !== 'superadmin') {
      alert('Only superadmin can permanently delete videos');
      return;
    }

    if (window.confirm(`Permanently delete "${video.title}"? This action cannot be undone.`)) {
      onDelete(video.id, 'permanent');
    }
  };

  return (
    <div className="video-card">
      <div className="video-thumbnail">
        <img 
          src={video.thumbnailUrl || 'https://via.placeholder.com/300x200?text=No+Thumbnail'} 
          alt={video.title}
        />
        <button className="play-button" onClick={() => onPlay(video.id)}>
          ▶
        </button>
        <span className="video-duration">
          {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
        </span>
      </div>

      <div className="video-info">
        <h3 className="video-title" title={video.title}>{video.title}</h3>
        
        <p className="video-description">{video.description || 'No description'}</p>

        <div className="video-meta">
          <span className="views">👁 {video.viewCount || 0} views</span>
          <span className="privacy">
            {video.isPublic ? '🌍 Public' : '🔒 Private'}
          </span>
        </div>

        {video.tags && video.tags.length > 0 && (
          <div className="video-tags">
            {video.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="video-actions">
          <button className="btn-action btn-play" onClick={() => onPlay(video.id)}>
            Play
          </button>
          
          <button 
            className={`btn-action btn-download ${video.isDownloaded ? 'active' : ''}`}
            onClick={() => onDownload(video.id)}
            title={video.isDownloaded ? 'Remove from downloads' : 'Download'}
          >
            {video.isDownloaded ? '✓ Downloaded' : 'Download'}
          </button>

          {isOwner && (
            <>
              <button 
                className="btn-action btn-privacy"
                onClick={() => onPrivacy(video.id)}
                title={video.isPublic ? 'Make private' : 'Make public'}
              >
                {video.isPublic ? '🔓 Public' : '🔒 Private'}
              </button>

              <button 
                className="btn-action btn-delete"
                onClick={handleDelete}
                title="Soft delete (remove from listing)"
              >
                🗑 Delete
              </button>

              {userRole === 'superadmin' && (
                <button 
                  className="btn-action btn-delete-permanent"
                  onClick={handlePermanentDelete}
                  title="Permanent delete (cannot be undone)"
                >
                  ⚠ Permanent Delete
                </button>
              )}
            </>
          )}
        </div>

        {video.embeddedLink && (
          <div className="embedded-link">
            <small>Embedded Link:</small>
            <input 
              type="text" 
              value={video.embeddedLink} 
              readOnly 
              onClick={(e) => e.target.select()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
