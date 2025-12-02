const videoService = require('../services/videoService');
const storageService = require('../services/storageService');
const { v4: uuidv4 } = require('uuid');

class VideoController {
  /**
   * Upload video
   */
  async uploadVideo(req, res) {
    try {
      const { title, description, tags, isPublic } = req.body;
      const userId = req.user.id;
      const videoFile = req.files?.video?.[0];
      const thumbnailFile = req.files?.thumbnail?.[0];

      if (!videoFile) {
        return res.status(400).json({
          success: false,
          message: 'Video file is required'
        });
      }

      // Create video metadata
      const videoId = uuidv4();
      const folderPath = await storageService.createVideoFolder(videoId, userId);

      // Upload video file
      const videoUpload = await storageService.uploadVideo(
        videoId,
        userId,
        videoFile.path,
        videoFile.originalname
      );

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbnailUpload = await storageService.uploadThumbnail(
          videoId,
          userId,
          thumbnailFile.path
        );
        thumbnailUrl = thumbnailUpload.publicUrl;
      }

      // Generate embedded link
      const embeddedLink = `https://yourapp.com/embed/${videoId}`;

      // Create video record in database
      const video = await videoService.createVideo({
        id: videoId,
        userId,
        title,
        description,
        tags: Array.isArray(tags) ? tags : tags?.split(',') || [],
        videoUrl: videoUpload.publicUrl,
        thumbnailUrl,
        cloudStoragePath: videoUpload.path,
        folderPath,
        isPublic: isPublic === 'true',
        embeddedLink,
        transcodingStatus: 'pending'
      });

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: video
      });
    } catch (error) {
      console.error('Upload video error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Upload caption
   */
  async uploadCaption(req, res) {
    try {
      const { videoId, language, languageCode } = req.body;
      const userId = req.user.id;
      const captionFile = req.files?.caption?.[0];

      if (!captionFile) {
        return res.status(400).json({
          success: false,
          message: 'Caption file is required'
        });
      }

      const video = await videoService.getVideo(videoId);
      if (video.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Upload caption file
      const captionUpload = await storageService.uploadCaption(
        videoId,
        userId,
        language,
        captionFile.path,
        captionFile.originalname
      );

      // Create caption record
      const Caption = require('../models/Caption');
      const caption = await Caption.create({
        id: uuidv4(),
        videoId,
        language,
        languageCode,
        captionUrl: captionUpload.publicUrl,
        cloudStoragePath: captionUpload.path,
        fileSize: captionFile.size
      });

      res.status(201).json({
        success: true,
        message: 'Caption uploaded successfully',
        data: caption
      });
    } catch (error) {
      console.error('Upload caption error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get user's videos
   */
  async getUserVideos(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      const videos = await videoService.getUserVideos(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: videos
      });
    } catch (error) {
      console.error('Get user videos error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get public videos
   */
  async getPublicVideos(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const videos = await videoService.getPublicVideos({
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: videos
      });
    } catch (error) {
      console.error('Get public videos error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get single video
   */
  async getVideo(req, res) {
    try {
      const { videoId } = req.params;

      const video = await videoService.getVideo(videoId);

      // Increment view count
      await videoService.incrementViewCount(videoId);

      res.json({
        success: true,
        data: video
      });
    } catch (error) {
      console.error('Get video error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Toggle video privacy
   */
  async togglePrivacy(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;

      const video = await videoService.toggleVideoPrivacy(videoId, userId);

      res.json({
        success: true,
        message: `Video is now ${video.isPublic ? 'public' : 'private'}`,
        data: video
      });
    } catch (error) {
      console.error('Toggle privacy error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Mark video as downloaded/undownloaded
   */
  async toggleDownloaded(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;

      const video = await videoService.markVideoDownloaded(videoId, userId);

      res.json({
        success: true,
        message: `Video marked as ${video.isDownloaded ? 'downloaded' : 'not downloaded'}`,
        data: video
      });
    } catch (error) {
      console.error('Toggle downloaded error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Soft delete video
   */
  async softDelete(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;

      const result = await videoService.softDeleteVideo(videoId, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Soft delete error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Permanent delete video
   */
  async permanentDelete(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await videoService.permanentDeleteVideo(videoId, userId, userRole);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Permanent delete error:', error);
      res.status(error.message.includes('superadmin') ? 403 : 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Search videos
   */
  async search(req, res) {
    try {
      const { query } = req.query;
      const userId = req.user?.id;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const videos = await videoService.searchVideos(query, userId);

      res.json({
        success: true,
        data: videos
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get download URL
   */
  async getDownloadUrl(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;

      const video = await videoService.getVideo(videoId);

      if (video.userId !== userId && !video.isPublic) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const downloadUrl = await storageService.getSignedDownloadUrl(
        video.cloudStoragePath,
        60 // 1 hour expiration
      );

      res.json({
        success: true,
        data: { downloadUrl }
      });
    } catch (error) {
      console.error('Get download URL error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new VideoController();
