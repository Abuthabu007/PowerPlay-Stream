import React, { useState, useEffect } from 'react';
import { videoAPI, searchAPI } from '../services/api';
import UploadDialog from '../components/UploadDialog';
import VideoCard from '../components/VideoCard';
import VideoPlayer from '../components/VideoPlayer';
import SearchBar from '../components/SearchBar';
import '../styles/HomePage.css';

const HomePage = ({ user, userRole }) => {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'my-videos', 'downloaded'
  const [searchQuery, setSearchQuery] = useState('');

  // Load videos on mount and when tab changes
  useEffect(() => {
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      if (activeTab === 'my-videos') {
        response = await videoAPI.getUserVideos();
      } else {
        response = await videoAPI.getPublicVideos();
      }

      setVideos(response.data.data || []);
      setFilteredVideos(response.data.data || []);
    } catch (err) {
      setError('Failed to load videos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    try {
      setSearchQuery(query);
      setLoading(true);
      const response = await searchAPI.semanticSearch(query);
      setFilteredVideos(response.data.data || []);
    } catch (err) {
      setError('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (videoId) => {
    const video = videos.find(v => v.id === videoId);
    if (video) {
      setSelectedVideo(video);
    }
  };

  const handleDownload = async (videoId) => {
    try {
      const response = await videoAPI.toggleDownloaded(videoId);
      // Update video in state
      setVideos(videos.map(v => v.id === videoId ? response.data.data : v));
      setFilteredVideos(filteredVideos.map(v => v.id === videoId ? response.data.data : v));
    } catch (err) {
      setError('Download toggle failed: ' + err.message);
    }
  };

  const handleDelete = async (videoId, type) => {
    try {
      let response;
      if (type === 'permanent') {
        response = await videoAPI.permanentDelete(videoId);
      } else {
        response = await videoAPI.softDelete(videoId);
      }

      // Remove video from state
      const newVideos = videos.filter(v => v.id !== videoId);
      setVideos(newVideos);
      setFilteredVideos(newVideos);

      // Show success message
      alert(response.data.message || 'Video deleted successfully');
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  const handlePrivacy = async (videoId) => {
    try {
      const response = await videoAPI.togglePrivacy(videoId);
      // Update video in state
      setVideos(videos.map(v => v.id === videoId ? response.data.data : v));
      setFilteredVideos(filteredVideos.map(v => v.id === videoId ? response.data.data : v));
    } catch (err) {
      setError('Privacy toggle failed: ' + err.message);
    }
  };

  const handleUploadSuccess = (newVideo) => {
    setVideos([newVideo, ...videos]);
    setFilteredVideos([newVideo, ...filteredVideos]);
  };

  const filterVideosByTab = (videos) => {
    if (activeTab === 'downloaded') {
      return videos.filter(v => v.isDownloaded);
    }
    return videos;
  };

  const displayVideos = filterVideosByTab(
    searchQuery ? filteredVideos : videos
  );

  return (
    <div className="home-page">
      <header className="app-header">
        <div className="header-content">
          <h1>🎬 PowerPlay Stream</h1>
          <div className="header-actions">
            <span className="user-info">👤 {user?.name || 'User'}</span>
            <button 
              className="btn-primary btn-upload"
              onClick={() => setShowUploadDialog(true)}
            >
              + Upload Video
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} />

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Videos
          </button>
          <button 
            className={`tab ${activeTab === 'my-videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-videos')}
          >
            My Videos
          </button>
          <button 
            className={`tab ${activeTab === 'downloaded' ? 'active' : ''}`}
            onClick={() => setActiveTab('downloaded')}
          >
            Downloaded
          </button>
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div className="loading">Loading videos...</div>
        ) : displayVideos.length === 0 ? (
          <div className="empty-state">
            <p>No videos found</p>
            {activeTab === 'my-videos' && (
              <button 
                className="btn-primary"
                onClick={() => setShowUploadDialog(true)}
              >
                Upload Your First Video
              </button>
            )}
          </div>
        ) : (
          <div className="videos-grid">
            {displayVideos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={handlePlay}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onPrivacy={handlePrivacy}
                currentUserId={user?.id}
                userRole={userRole}
              />
            ))}
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onDownload={handleDownload}
        />
      )}

      {/* Upload Dialog Modal */}
      {showUploadDialog && (
        <UploadDialog
          onClose={() => setShowUploadDialog(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default HomePage;
