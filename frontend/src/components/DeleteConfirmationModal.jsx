import React from 'react';
import '../styles/DeleteConfirmationModal.css';

const DeleteConfirmationModal = ({ 
  videoTitle, 
  onSoftDelete, 
  onPermanentDelete, 
  onCancel,
  isPermanent = false
}) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Video</h2>
          <button className="modal-close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="warning-icon">⚠️</div>
          <h3>Delete "{videoTitle}"?</h3>
          
          <p className="modal-description">
            Choose how you would like to proceed:
          </p>

          <div className="delete-options">
            <div className="option-card soft-delete">
              <div className="option-icon">🗑️</div>
              <h4>Soft Delete</h4>
              <p>Remove from your video listing. Video can be restored later.</p>
              <button 
                className="btn-soft-delete"
                onClick={onSoftDelete}
              >
                Remove from Listing
              </button>
            </div>

            <div className="option-divider">OR</div>

            <div className="option-card permanent-delete">
              <div className="option-icon">🔥</div>
              <h4>Permanent Delete</h4>
              <p>Permanently delete video from database and all storage. <strong>Cannot be undone!</strong></p>
              <button 
                className="btn-permanent-delete"
                onClick={onPermanentDelete}
              >
                Permanently Delete Everything
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
