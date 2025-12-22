const videoService = require('../services/videoService');
const storageService = require('../services/storageService');
const securityService = require('../services/securityService');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

class VideoController {
  /**
   * Upload video
   */
  async uploadVideo(req, res) {
    let videoFile = null;
    let thumbnailFile = null;
    
    try {
      const { title, description, tags, isPublic } = req.body;
      const userId = req.user.id;
      videoFile = req.files?.video?.[0];
      thumbnailFile = req.files?.thumbnail?.[0];

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

      // ============================================
      // SECURITY CHECK: Validate video file
      // ============================================
      console.log('[UPLOAD] Running security checks on video file...');
      const videoSecurityCheck = await securityService.validateFileBeforeUpload(
        videoFile.path,
        videoFile.originalname,
        videoFile.mimetype
      );

      if (!videoSecurityCheck.valid) {
        console.error('[UPLOAD] Security check FAILED for video:', videoSecurityCheck.errors);
        
        // Clean up uploaded file
        try {
          fs.unlinkSync(videoFile.path);
        } catch (e) {
          console.warn('[UPLOAD] Could not delete rejected file');
        }

        return res.status(400).json({
          success: false,
          message: 'Video file failed security checks',
          errors: videoSecurityCheck.errors,
          warnings: videoSecurityCheck.warnings
        });
      }

      // Log warnings if any
      if (videoSecurityCheck.warnings.length > 0) {
        console.warn('[UPLOAD] Security warnings:', videoSecurityCheck.warnings);
      }

      console.log('[UPLOAD] Security check PASSED for video');

      // ============================================
      // SECURITY CHECK: Validate thumbnail file (if provided)
      // ============================================
      if (thumbnailFile) {
        console.log('[UPLOAD] Running security checks on thumbnail file...');
        const thumbnailSecurityCheck = await securityService.validateFileBeforeUpload(
          thumbnailFile.path,
          thumbnailFile.originalname,
          thumbnailFile.mimetype
        );

        if (!thumbnailSecurityCheck.valid) {
          console.error('[UPLOAD] Security check FAILED for thumbnail:', thumbnailSecurityCheck.errors);
          
          // Clean up uploaded files
          try {
            fs.unlinkSync(videoFile.path);
            fs.unlinkSync(thumbnailFile.path);
          } catch (e) {
            console.warn('[UPLOAD] Could not delete rejected files');
          }

          return res.status(400).json({
            success: false,
            message: 'Thumbnail file failed security checks',
            errors: thumbnailSecurityCheck.errors,
            warnings: thumbnailSecurityCheck.warnings
          });
        }

        console.log('[UPLOAD] Security check PASSED for thumbnail');
      }

      // ============================================
      // All security checks passed - proceed with upload
      // ============================================

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
      
      // Clean up uploaded files on error
      try {
        if (videoFile?.path && fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }
        if (thumbnailFile?.path && fs.existsSync(thumbnailFile.path)) {
          fs.unlinkSync(thumbnailFile.path);
        }
      } catch (e) {
        console.warn('[UPLOAD] Could not clean up files:', e.message);
      }

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
    let captionFile = null;
    
    try {
      const { videoId, language, languageCode } = req.body;
      const userId = req.user.id;
      captionFile = req.files?.caption?.[0];

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

      // ============================================
      // SECURITY CHECK: Validate caption file
      // ============================================
      console.log('[UPLOAD] Running security checks on caption file...');
      const captionSecurityCheck = await securityService.validateFileBeforeUpload(
        captionFile.path,
        captionFile.originalname,
        captionFile.mimetype
      );

      if (!captionSecurityCheck.valid) {
        console.error('[UPLOAD] Security check FAILED for caption:', captionSecurityCheck.errors);
        
        // Clean up uploaded file
        try {
          fs.unlinkSync(captionFile.path);
        } catch (e) {
          console.warn('[UPLOAD] Could not delete rejected file');
        }

        return res.status(400).json({
          success: false,
          message: 'Caption file failed security checks',
          errors: captionSecurityCheck.errors,
          warnings: captionSecurityCheck.warnings
        });
      }

      console.log('[UPLOAD] Security check PASSED for caption');

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
      
      // Clean up uploaded file on error
      try {
        if (captionFile?.path && fs.existsSync(captionFile.path)) {
          fs.unlinkSync(captionFile.path);
        }
      } catch (e) {
        console.warn('[UPLOAD] Could not clean up file:', e.message);
      }

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

      // Generate signed URLs for all videos
      const videosWithSignedUrls = await Promise.all(
        videos.map(async (video) => {
          if (video && video.cloudStoragePath) {
            try {
              const signedUrl = await storageService.getSignedDownloadUrl(
                video.cloudStoragePath,
                60 // 60 minutes expiration
              );
              video.videoUrl = signedUrl;
            } catch (signedUrlError) {
              console.warn('[VIDEO] Could not generate signed URL:', signedUrlError.message);
              // Fall back to stored URL if signing fails
            }
          }
          return video;
        })
      );

      res.json({
        success: true,
        data: videosWithSignedUrls
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

      // Generate signed URLs for all videos
      const videosWithSignedUrls = await Promise.all(
        videos.map(async (video) => {
          if (video && video.cloudStoragePath) {
            try {
              const signedUrl = await storageService.getSignedDownloadUrl(
                video.cloudStoragePath,
                60 // 60 minutes expiration
              );
              video.videoUrl = signedUrl;
            } catch (signedUrlError) {
              console.warn('[VIDEO] Could not generate signed URL:', signedUrlError.message);
              // Fall back to stored URL if signing fails
            }
          }
          return video;
        })
      );

      res.json({
        success: true,
        data: videosWithSignedUrls
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

      // Generate signed URL for video file if available
      if (video && video.cloudStoragePath) {
        try {
          const signedUrl = await storageService.getSignedDownloadUrl(
            video.cloudStoragePath,
            60 // 60 minutes expiration
          );
          video.videoUrl = signedUrl;
          console.log('[VIDEO] Generated signed URL for video:', videoId);
        } catch (signedUrlError) {
          console.warn('[VIDEO] Could not generate signed URL:', signedUrlError.message);
          // Fall back to stored URL if signing fails
        }
      }

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
    let chunkFile = null;
    
    try {
      const { uploadId, chunkIndex, totalChunks, title, description, tags, isPublic } = req.body;
      const userId = req.user.id;
      chunkFile = req.file;

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

      // ============================================
      // SECURITY CHECK: Validate chunk file
      // ============================================
      console.log('[CHUNK_UPLOAD] Running security checks on chunk file...');
      const chunkSecurityCheck = await securityService.validateFileBeforeUpload(
        chunkFile.path,
        `chunk-${chunkIndex}`,
        chunkFile.mimetype
      );

      if (!chunkSecurityCheck.valid) {
        console.error('[CHUNK_UPLOAD] Security check FAILED:', chunkSecurityCheck.errors);
        
        // Clean up uploaded chunk
        try {
          fs.unlinkSync(chunkFile.path);
        } catch (e) {
          console.warn('[CHUNK_UPLOAD] Could not delete rejected chunk');
        }

        return res.status(400).json({
          success: false,
          message: 'Chunk file failed security checks',
          errors: chunkSecurityCheck.errors,
          warnings: chunkSecurityCheck.warnings
        });
      }

      console.log('[CHUNK_UPLOAD] Security check PASSED for chunk');

      // Create temp directory for chunks
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

            // ============================================
            // SECURITY CHECK: Validate final combined video
            // ============================================
            console.log('[CHUNK_UPLOAD] Running security checks on combined video...');
            const combinedSecurityCheck = await securityService.validateFileBeforeUpload(
              finalVideoPath,
              `${title || 'untitled'}.mp4`,
              'video/mp4'
            );

            if (!combinedSecurityCheck.valid) {
              console.error('[CHUNK_UPLOAD] Security check FAILED for combined video:', combinedSecurityCheck.errors);
              
              // Clean up combined video and temp files
              try {
                fs.unlinkSync(finalVideoPath);
                fs.rmSync(tempDir, { recursive: true, force: true });
              } catch (e) {
                console.warn('[CHUNK_UPLOAD] Could not clean up files');
              }

              return res.status(400).json({
                success: false,
                message: 'Combined video failed security checks',
                errors: combinedSecurityCheck.errors,
                warnings: combinedSecurityCheck.warnings
              });
            }

            console.log('[CHUNK_UPLOAD] Security check PASSED for combined video');

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
