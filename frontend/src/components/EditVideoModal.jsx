import React, { useState } from 'react';
import '../styles/EditVideoModal.css';

const EditVideoModal = ({ video, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: video.title || '',
    description: video.description || '',
    tags: (video.tags && video.tags.length > 0) ? video.tags.join(', ') : '',
    isPublic: video.isPublic !== false
  });

  const [saving, setSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
        isPublic: formData.isPublic
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
