const { bucket } = require('../config/storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class StorageService {
  constructor() {
    this.useLocalStorage = !bucket;
    this.localStoragePath = path.join(__dirname, '../../uploads');
    
    if (this.useLocalStorage) {
      console.log('Using local file storage:', this.localStoragePath);
      if (!fs.existsSync(this.localStoragePath)) {
        fs.mkdirSync(this.localStoragePath, { recursive: true });
      }
    }
  }

  /**
   * Create a unique folder for video upload with title
   */
  async createVideoFolder(videoId, userId, videoTitle = '') {
    // Sanitize title for use in path
    const sanitizedTitle = videoTitle
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50) // Limit to 50 chars
      .toLowerCase() || 'untitled';
    
    const folderPath = `videos/${userId}/${videoId}_${sanitizedTitle}`;
    
    if (this.useLocalStorage) {
      const fullPath = path.join(this.localStoragePath, folderPath);
      fs.mkdirSync(fullPath, { recursive: true });
      console.log('[STORAGE] Created local folder:', fullPath);
    }
    
    return folderPath;
  }

  /**
   * Upload file to Cloud Storage or local filesystem
   */
  async uploadFile(filePath, localPath, metadata = {}) {
    try {
      if (this.useLocalStorage) {
        // Local file storage
        const fullPath = path.join(this.localStoragePath, filePath);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.copyFileSync(localPath, fullPath);
        
        return {
          success: true,
          path: filePath,
          publicUrl: `/uploads/${filePath}`
        };
      } else {
        // Cloud Storage
        const file = bucket.file(filePath);
        await file.save(fs.readFileSync(localPath), {
          metadata: {
            metadata: metadata
          }
        });
        return {
          success: true,
          path: filePath,
          publicUrl: `https://storage.googleapis.com/${bucket.name}/${filePath}`
        };
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Upload video file
   */
  async uploadVideo(videoId, userId, localPath, fileName) {
    const folderPath = `videos/${userId}/${videoId}`;
    const filePath = `${folderPath}/video/${fileName}`;
    
    return this.uploadFile(filePath, localPath, {
      videoId,
      userId,
      type: 'video'
    });
  }

  /**
   * Upload thumbnail
   */
  async uploadThumbnail(videoId, userId, localPath) {
    const folderPath = `videos/${userId}/${videoId}`;
    const filePath = `${folderPath}/thumbnail/thumbnail.jpg`;
    
    return this.uploadFile(filePath, localPath, {
      videoId,
      userId,
      type: 'thumbnail'
    });
  }

  /**
   * Upload caption file
   */
  async uploadCaption(videoId, userId, language, localPath, fileName) {
    const folderPath = `videos/${userId}/${videoId}`;
    const filePath = `${folderPath}/captions/${language}/${fileName}`;
    
    return this.uploadFile(filePath, localPath, {
      videoId,
      userId,
      language,
      type: 'caption'
    });
  }

  /**
   * Delete file from Cloud Storage or local filesystem
   */
  async deleteFile(filePath) {
    try {
      if (this.useLocalStorage) {
        const fullPath = path.join(this.localStoragePath, filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        return { success: true };
      } else {
        const file = bucket.file(filePath);
        await file.delete();
        return { success: true };
      }
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  /**
   * Delete entire video folder
   */
  async deleteVideoFolder(userId, videoId) {
    try {
      const folderPath = `videos/${userId}/${videoId}`;
      
      if (this.useLocalStorage) {
        const fullPath = path.join(this.localStoragePath, folderPath);
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
        return { success: true };
      } else {
        const [files] = await bucket.getFiles({ prefix: folderPath });
        for (const file of files) {
          await file.delete();
        }
        return { success: true };
      }
    } catch (error) {
      console.error('Delete folder error:', error);
      throw error;
    }
  }

  /**
   * Get signed download URL or local file URL
   */
  async getSignedDownloadUrl(filePath, expirationMinutes = 60) {
    try {
      if (this.useLocalStorage) {
        // For local storage, return a relative URL
        // The backend serves these files via express.static
        return `/uploads/${filePath}`;
      } else {
        const file = bucket.file(filePath);
        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + expirationMinutes * 60 * 1000
        });
        return url;
      }
    } catch (error) {
      console.error('Signed URL error:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();
