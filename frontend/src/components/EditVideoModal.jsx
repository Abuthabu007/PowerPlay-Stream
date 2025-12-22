import React, { useState } from 'react';
import '../styles/EditVideoModal.css';

const EditVideoModal = ({ video, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: video.title || '',
    description: video.description || '',
    tags: (video.tags && video.tags.length > 0) ? video.tags.join(', ') : '',
    isPublic: video.isPublic !== false
  });

  const [files, setFiles] = useState({
    thumbnail: null,
    video: null
  });

  const [filePreviews, setFilePreviews] = useState({
    thumbnail: video.thumbnailUrl || null,
    video: null
  });

  const [saving, setSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({
        ...prev,
        [fileType]: file
      }));

      // Create preview
      if (fileType === 'thumbnail') {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreviews(prev => ({
            ...prev,
            thumbnail: event.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a video title');
      return;
    }

    try {
      setSaving(true);

      const updatedData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        tags: formData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0),
        isPublic: formData.isPublic,
        thumbnail: files.thumbnail,
        videoFile: files.video
      };

      onSave(updatedData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-modal-overlay" onClick={onCancel}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h2>Edit Video Details</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form className="edit-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <label htmlFor="title">Video Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter video title"
              required
            />
          </div>

          <div className="form-section">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter video description"
              rows="4"
            />
          </div>

          <div className="form-section">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="e.g. nature, scenic, travel"
            />
          </div>

          <div className="form-section">
            <label htmlFor="thumbnail-upload">Change Thumbnail (Optional)</label>
            <div className="file-upload-section">
              {filePreviews.thumbnail && (
                <div className="thumbnail-preview">
                  <img src={filePreviews.thumbnail} alt="Thumbnail preview" />
                  <small>{files.thumbnail ? 'New thumbnail' : 'Current thumbnail'}</small>
                </div>
              )}
              <input
                type="file"
                id="thumbnail-upload"
                name="thumbnail"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'thumbnail')}
                className="file-input"
              />
              <label htmlFor="thumbnail-upload" className="file-input-label">
                📸 Choose Thumbnail Image
              </label>
            </div>
          </div>

          <div className="form-section">
            <label htmlFor="video-upload">Replace Video (Optional)</label>
            <div className="file-upload-section">
              {files.video && (
                <div className="video-file-info">
                  <p>📹 {files.video.name}</p>
                  <small>{(files.video.size / (1024 * 1024)).toFixed(2)} MB</small>
                </div>
              )}
              <input
                type="file"
                id="video-upload"
                name="videoFile"
                accept="video/*"
                onChange={(e) => handleFileChange(e, 'video')}
                className="file-input"
              />
              <label htmlFor="video-upload" className="file-input-label">
                🎬 Choose Video File
              </label>
            </div>
          </div>

          <div className="form-section checkbox">
            <label>
              <input
                type="checkbox"
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleInputChange}
              />
              <span>Make this video public</span>
            </label>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVideoModal;
