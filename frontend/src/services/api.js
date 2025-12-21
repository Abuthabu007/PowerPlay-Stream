import axios from 'axios';

// Determine API URL based on environment
let API_BASE_URL = 'https://looply-backend-687745071178.us-central1.run.app/api';

// Override if explicitly set
if (process.env.REACT_APP_API_URL) {
  API_BASE_URL = process.env.REACT_APP_API_URL;
} else if (window.location.hostname === 'localhost') {
  API_BASE_URL = 'http://localhost:5000/api';
}

console.log('API_BASE_URL:', API_BASE_URL);

// Get IAP token from Authorization header
const getAuthToken = () => {
  return localStorage.getItem('iapToken') || null;
};

// Create axios instance with default headers
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to request headers
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Video API endpoints
export const videoAPI = {
  // Upload video
  uploadVideo: (formData) => {
    return apiClient.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Upload caption
  uploadCaption: (videoId, formData) => {
    return apiClient.post(`/videos/${videoId}/caption`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Get user's videos
  getUserVideos: (limit = 20, offset = 0) => {
    return apiClient.get('/videos/my-videos', {
      params: { limit, offset }
    });
  },

  // Get public videos
  getPublicVideos: (limit = 20, offset = 0) => {
    return apiClient.get('/videos/public/list', {
      params: { limit, offset }
    });
  },

  // Get single video
  getVideo: (videoId) => {
    return apiClient.get(`/videos/${videoId}`);
  },

  // Toggle privacy
  togglePrivacy: (videoId) => {
    return apiClient.patch(`/videos/${videoId}/privacy`);
  },

  // Toggle downloaded
  toggleDownloaded: (videoId) => {
    return apiClient.patch(`/videos/${videoId}/downloaded`);
  },

  // Get download URL
  getDownloadUrl: (videoId) => {
    return apiClient.get(`/videos/${videoId}/download`);
  },

  // Soft delete video
  softDelete: (videoId) => {
    return apiClient.delete(`/videos/${videoId}`);
  },

  // Permanent delete video
  permanentDelete: (videoId) => {
    return apiClient.delete(`/videos/${videoId}/permanent`);
  }
};

// Search API endpoints
export const searchAPI = {
  // Get suggestions
  getSuggestions: (query) => {
    return apiClient.get('/search/suggestions', {
      params: { query }
    });
  },

  // Semantic search
  semanticSearch: (query) => {
    return apiClient.get('/search/semantic', {
      params: { query }
    });
  },

  // Find similar videos
  findSimilar: (videoId) => {
    return apiClient.get(`/search/${videoId}/similar`);
  }
};

export default apiClient;
