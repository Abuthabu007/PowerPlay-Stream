import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import '../styles/UploadDialog.css';

// Separate component for caption dropzones to avoid hook calls in loops
const CaptionDropzone = ({ language, label, onDrop, captionAdded }) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (files) => onDrop(files, language)
  });

  return (
    <div className="caption-item">
      <label>{label}</label>
      <div {...getRootProps()} className="dropzone-small">
        <input {...getInputProps()} />
        {captionAdded ? (
          <p className="file-selected">✓ Caption added</p>
        ) : (
          <p>Add {label} caption</p>
        )}
      </div>
    </div>
  );
};

const UploadDialog = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    isPublic: true,
    captions: []
  });

  const [videoFile, setVideoFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'tr', label: 'Turkish' },
    { code: 'ar', label: 'Arabic' },
    { code: 'fr', label: 'French' }
  ];

  // Video upload
  const onVideoDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setVideoFile(acceptedFiles[0]);
      setError('');
    }
  }, []);

  // Thumbnail upload
  const onThumbnailDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setError('');
    }
  }, []);

  // Caption upload
  const onCaptionDrop = useCallback((acceptedFiles, language) => {
    if (acceptedFiles.length > 0) {
      setFormData(prev => ({
        ...prev,
        captions: [
          ...prev.captions.filter(c => c.language !== language),
          { language, file: acceptedFiles[0] }
        ]
      }));
      setError('');
    }
  }, []);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } = useDropzone({
    onDrop: onVideoDrop,
    accept: { 'video/*': ['.mp4', '.avi', '.mov', '.mkv'] }
  });

  const { getRootProps: getThumbnailRootProps, getInputProps: getThumbnailInputProps } = useDropzone({
    onDrop: onThumbnailDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    multiple: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a video title');
      return;
    }

    try {
      setUploading(true);

      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('tags', formData.tags);
      uploadFormData.append('isPublic', formData.isPublic);
      uploadFormData.append('video', videoFile);
      
      if (thumbnail) {
        uploadFormData.append('thumbnail', thumbnail);
      }

      // Submit form data
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      onSuccess(result.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-dialog-overlay" onClick={onClose}>
      <div className="upload-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="upload-dialog-header">
          <h2>Upload Video</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {error && <div className="error-message">{error}</div>}

          {/* Video Upload */}
          <div className="form-section">
            <label>Video File *</label>
            <div {...getVideoRootProps()} className="dropzone">
              <input {...getVideoInputProps()} />
              {videoFile ? (
                <p className="file-selected">✓ {videoFile.name}</p>
              ) : (
                <p>Drag and drop your video here, or click to select</p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="form-section">
            <label>Video Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter video title"
              maxLength="200"
            />
          </div>

          {/* Description */}
          <div className="form-section">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter video description"
              rows="4"
              maxLength="1000"
            />
          </div>

          {/* Tags */}
          <div className="form-section">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="e.g., education, tutorial, sports"
            />
          </div>

          {/* Thumbnail */}
          <div className="form-section">
            <label>Thumbnail</label>
            <div {...getThumbnailRootProps()} className="dropzone">
              <input {...getThumbnailInputProps()} />
              {thumbnailPreview ? (
                <div className="thumbnail-preview">
                  <img src={thumbnailPreview} alt="Thumbnail" />
                </div>
              ) : (
                <p>Drag and drop thumbnail here, or click to select</p>
              )}
            </div>
          </div>

          {/* Captions */}
          <div className="form-section">
            <label>Captions (Optional)</label>
            <div className="captions-container">
              {languages.map(lang => (
                <CaptionDropzone
                  key={lang.code}
                  language={lang.code}
                  label={lang.label}
                  onDrop={onCaptionDrop}
                  captionAdded={!!formData.captions.find(c => c.language === lang.code)}
                />
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className="form-section">
            <label>
              <input
                type="checkbox"
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleInputChange}
              />
              Make this video public
            </label>
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadDialog;
