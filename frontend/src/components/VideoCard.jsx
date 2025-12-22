import React, { useState } from 'react';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import '../styles/VideoCard.css';

const VideoCard = ({ video, onPlay, onDownload, onDelete, onPrivacy, currentUserId, userRole }) => {
  const isOwner = video.userId === currentUserId;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleSoftDelete = () => {
    setShowDeleteModal(false);
    onDelete(video.id, 'soft');
  };

  const handlePermanentDelete = () => {
    if (userRole !== 'superadmin') {
      alert('Only superadmin can permanently delete videos');
      return;
    }
    setShowDeleteModal(false);
    onDelete(video.id, 'permanent');
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className="video-card">
      {showDeleteModal && (
        <DeleteConfirmationModal
          videoTitle={video.title}
          onSoftDelete={handleSoftDelete}
          onPermanentDelete={handlePermanentDelete}
          onCancel={handleCancelDelete}
        />
      )}

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
                className="btn-action btn-delete"
                onClick={handleDeleteClick}
                title="Delete video"
              >
                🗑 Delete
              </button>

              {userRole === 'superadmin' && (
                <button 
                  className="btn-action btn-delete-permanent"
                  onClick={handleDeleteClick}
                  title="Delete video (show options)"
                >
                  ⚠ More Options
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
