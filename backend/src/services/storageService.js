const { bucket } = require('../config/storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class StorageService {
  /**
   * Create a unique folder for video upload
   */
  async createVideoFolder(videoId, userId) {
    const folderPath = `videos/${userId}/${videoId}`;
    return folderPath;
  }

  /**
   * Upload file to Cloud Storage
   */
  async uploadFile(filePath, localPath, metadata = {}) {
    try {
      const file = bucket.file(filePath);
      await file.save(require('fs').readFileSync(localPath), {
        metadata: {
          metadata: metadata
        }
      });
      return {
        success: true,
        path: filePath,
        publicUrl: `https://storage.googleapis.com/${bucket.name}/${filePath}`
      };
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
   * Delete file from Cloud Storage
   */
  async deleteFile(filePath) {
    try {
      const file = bucket.file(filePath);
      await file.delete();
      return { success: true };
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
      const [files] = await bucket.getFiles({ prefix: folderPath });
      
      for (const file of files) {
        await file.delete();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Delete folder error:', error);
      throw error;
    }
  }

  /**
   * Get signed download URL
   */
  async getSignedDownloadUrl(filePath, expirationMinutes = 60) {
    try {
      const file = bucket.file(filePath);
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000
      });
      return url;
    } catch (error) {
      console.error('Signed URL error:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();
