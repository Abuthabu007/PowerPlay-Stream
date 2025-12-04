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

      console.log('[UPLOAD] Starting video upload');
      console.log('[UPLOAD] User ID:', userId);
      console.log('[UPLOAD] Title:', title);
      console.log('[UPLOAD] Video file:', videoFile ? { name: videoFile.originalname, size: videoFile.size } : 'none');
      console.log('[UPLOAD] Thumbnail file:', thumbnailFile ? { name: thumbnailFile.originalname, size: thumbnailFile.size } : 'none');

      if (!videoFile) {
        return res.status(400).json({
          success: false,
          message: 'Video file is required'
        });
      }

      // Create video metadata
      const videoId = uuidv4();
      console.log('[UPLOAD] Generated video ID:', videoId);
      
      const folderPath = await storageService.createVideoFolder(videoId, userId, title);
      console.log('[UPLOAD] Created folder path:', folderPath);

      // Upload video file
      const videoUpload = await storageService.uploadVideo(
        videoId,
        userId,
        videoFile.path,
        videoFile.originalname
      );
      console.log('[UPLOAD] Video uploaded:', videoUpload);

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbnailUpload = await storageService.uploadThumbnail(
          videoId,
          userId,
          thumbnailFile.path
        );
        thumbnailUrl = thumbnailUpload.publicUrl;
        console.log('[UPLOAD] Thumbnail uploaded:', thumbnailUpload);
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

      console.log('[UPLOAD] Video record created in DB:', video.id);

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: video
      });
    } catch (error) {
      console.error('[UPLOAD] Upload video error:', error);
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

  /**
   * Upload video chunk (for large files >30MB)
   */
  async uploadVideoChunk(req, res) {
    try {
      const { uploadId, chunkIndex, totalChunks, title, description, tags, isPublic } = req.body;
      const userId = req.user.id;
      const chunkFile = req.file;

      console.log(`[CHUNK_UPLOAD] Chunk ${chunkIndex}/${totalChunks} for upload ${uploadId}`);

      if (!chunkFile) {
        return res.status(400).json({
          success: false,
          message: 'Chunk file is required'
        });
      }

      if (!uploadId || chunkIndex === undefined || !totalChunks) {
        return res.status(400).json({
          success: false,
          message: 'uploadId, chunkIndex, and totalChunks are required'
        });
      }

      // Create temp directory for chunks
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(__dirname, '../../temp-uploads', uploadId);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Save chunk
      const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);
      fs.copyFileSync(chunkFile.path, chunkPath);
      console.log(`[CHUNK_UPLOAD] Saved chunk to ${chunkPath}`);

      // Check if all chunks received
      const chunks = fs.readdirSync(tempDir).filter(f => f.startsWith('chunk-')).length;
      console.log(`[CHUNK_UPLOAD] Received ${chunks}/${totalChunks} chunks`);

      if (chunks === parseInt(totalChunks)) {
        // All chunks received, combine them
        console.log(`[CHUNK_UPLOAD] All chunks received, combining...`);

        const videoId = uuidv4();
        const finalVideoPath = path.join(__dirname, '../../uploads', `${uploadId}-combined.mp4`);
        const writeStream = fs.createWriteStream(finalVideoPath);

        for (let i = 0; i < parseInt(totalChunks); i++) {
          const chunk = fs.readFileSync(path.join(tempDir, `chunk-${i}`));
          writeStream.write(chunk);
        }
        writeStream.end();

        writeStream.on('finish', async () => {
          try {
            console.log(`[CHUNK_UPLOAD] Combined video saved to ${finalVideoPath}`);

            // Create video folder with title
            const folderPath = await storageService.createVideoFolder(videoId, userId, title);
            
            // Upload combined video
            const videoUpload = await storageService.uploadVideo(
              videoId,
              userId,
              finalVideoPath,
              `${title || 'untitled'}.mp4`
            );

            // Create video record in database
            const video = await videoService.createVideo({
              id: videoId,
              userId,
              title,
              description,
              tags: Array.isArray(tags) ? tags : (tags?.split(',') || []),
              videoUrl: videoUpload.publicUrl,
              thumbnailUrl: null,
              cloudStoragePath: videoUpload.path,
              folderPath,
              isPublic: isPublic === 'true',
              embeddedLink: `https://yourapp.com/embed/${videoId}`,
              transcodingStatus: 'pending'
            });

            // Cleanup
            fs.rmSync(tempDir, { recursive: true, force: true });
            fs.unlinkSync(finalVideoPath);

            res.status(201).json({
              success: true,
              message: 'Video uploaded successfully from chunks',
              data: video
            });
          } catch (error) {
            console.error('[CHUNK_UPLOAD] Error finalizing upload:', error);
            res.status(500).json({
              success: false,
              message: error.message
            });
          }
        });
      } else {
        res.json({
          success: true,
          message: `Chunk ${chunkIndex} received (${chunks}/${totalChunks})`,
          uploadId,
          chunkIndex,
          totalChunks
        });
      }
    } catch (error) {
      console.error('[CHUNK_UPLOAD] Error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new VideoController();
