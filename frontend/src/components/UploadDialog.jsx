import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import '../styles/UploadDialog.css';

// Backend API URL
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://looply-backend-687745071178.us-central1.run.app';

/**
 * Capture thumbnail from video at specified time (in seconds)
 */
const captureVideoThumbnail = (videoFile, timeInSeconds = 1) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to specified time
      video.currentTime = Math.min(timeInSeconds, video.duration - 0.1);
    };

    video.onseeked = () => {
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create File object from blob
          const thumbnailFile = new File(
            [blob],
            `thumbnail-${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );
          const previewUrl = canvas.toDataURL('image/jpeg');
          resolve({ file: thumbnailFile, preview: previewUrl });
        } else {
          reject(new Error('Failed to create thumbnail blob'));
        }
      }, 'image/jpeg', 0.9);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for thumbnail capture'));
    };

    // Load video file
    const url = URL.createObjectURL(videoFile);
    video.src = url;
  });
};

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
  const [capturingThumbnail, setCapturingThumbnail] = useState(false);
  const [showVideoScrubber, setShowVideoScrubber] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Video element ref for scrubber
  const videoRefForScrubber = React.useRef(null);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'tr', label: 'Turkish' },
    { code: 'ar', label: 'Arabic' },
    { code: 'fr', label: 'French' }
  ];

  // Video upload - with automatic thumbnail capture
  const onVideoDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setVideoFile(file);
      setError('');
      setShowVideoScrubber(true); // Show scrubber when video is selected
      
      // Auto-capture thumbnail from video
      setCapturingThumbnail(true);
      captureVideoThumbnail(file, 1)
        .then(({ file: thumbFile, preview }) => {
          setThumbnail(thumbFile);
          setThumbnailPreview(preview);
          setCapturingThumbnail(false);
          console.log('[UPLOAD] Auto-captured thumbnail from video');
        })
        .catch((err) => {
          console.warn('[UPLOAD] Failed to auto-capture thumbnail:', err);
          setCapturingThumbnail(false);
          // Allow upload to continue without thumbnail
        });
    }
  }, []);

  // Handle video metadata loaded
  const handleVideoMetadataLoaded = () => {
    if (videoRefForScrubber.current) {
      setVideoDuration(videoRefForScrubber.current.duration);
      setCurrentTime(0);
    }
  };

  // Handle timeline scrubbing
  const handleTimelineChange = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRefForScrubber.current) {
      videoRefForScrubber.current.currentTime = time;
    }
  };

  // Capture thumbnail at current time
  const captureManualThumbnail = async () => {
    if (!videoRefForScrubber.current) return;

    try {
      const video = videoRefForScrubber.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const thumbFile = new File(
            [blob],
            `thumbnail-${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );
          const previewUrl = canvas.toDataURL('image/jpeg');
          setThumbnail(thumbFile);
          setThumbnailPreview(previewUrl);
          setShowVideoScrubber(false);
          console.log('[UPLOAD] Manual thumbnail captured at', Math.floor(currentTime), 'seconds');
        }
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('[UPLOAD] Error capturing manual thumbnail:', err);
      setError('Failed to capture thumbnail');
    }
  };

  // Thumbnail upload (manual override)
  const onThumbnailDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setError('');
      setShowVideoScrubber(false);
      console.log('[UPLOAD] Manual thumbnail selected - overriding auto-captured thumbnail');
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

      // Get token from localStorage
      const token = localStorage.getItem('iapToken');
      
      // Submit form data with proper CORS headers
      const response = await fetch(`${API_BASE_URL}/api/videos/upload`, {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'omit' // Don't send cookies, we're using Authorization header
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
            <label>Thumbnail {capturingThumbnail && <span className="auto-capture-status">🎬 Auto-capturing...</span>}</label>
            <div {...getThumbnailRootProps()} className="dropzone">
              <input {...getThumbnailInputProps()} />
              {thumbnailPreview ? (
                <div className="thumbnail-preview">
                  <img src={thumbnailPreview} alt="Thumbnail" />
                  <p className="thumbnail-status">
                    {thumbnail ? '✓ Thumbnail Ready' : '📹 Auto-captured from video'}
                  </p>
                </div>
              ) : capturingThumbnail ? (
                <p>🎬 Capturing thumbnail from video...</p>
              ) : (
                <p>Drag and drop thumbnail here, or click to select (or auto-captured from video)</p>
              )}
            </div>
            {videoFile && !thumbnailPreview && (
              <button 
                type="button"
                className="btn-secondary capture-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setShowVideoScrubber(!showVideoScrubber);
                }}
              >
                🎬 {showVideoScrubber ? 'Hide' : 'Select Custom Thumbnail'}
              </button>
            )}
          </div>

          {/* Video Scrubber for Manual Thumbnail Capture */}
          {showVideoScrubber && videoFile && (
            <div className="form-section video-scrubber-section">
              <label>Drag the timeline to select thumbnail frame</label>
              <video
                ref={videoRefForScrubber}
                src={URL.createObjectURL(videoFile)}
                onLoadedMetadata={handleVideoMetadataLoaded}
                className="scrubber-video"
                style={{ width: '100%', borderRadius: '6px', marginBottom: '12px' }}
              />
              <div className="timeline-controls">
                <input
                  type="range"
                  min="0"
                  max={Math.floor(videoDuration) || 0}
                  value={Math.floor(currentTime)}
                  onChange={handleTimelineChange}
                  className="timeline-slider"
                />
                <div className="time-display">
                  {Math.floor(currentTime)}s / {Math.floor(videoDuration)}s
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={captureManualThumbnail}
              >
                ✓ Capture Thumbnail at {Math.floor(currentTime)}s
              </button>
            </div>
          )}

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
