const Video = require('../models/Video');
const storageService = require('./storageService');

class VideoService {
  /**
   * Create new video metadata in Firestore
   */
  async createVideo(videoData) {
    try {
      console.log('[VIDEO_SERVICE] Creating video with data:', { ...videoData, cloudStoragePath: '[path]', videoUrl: '[url]' });
      
      const video = await Video.create(videoData);

      console.log('[VIDEO_SERVICE] Video created with ID:', video.id);

      // Publish event for transcoding
      await this.publishTranscodingEvent(video.id, 'video_uploaded');

      return video;
    } catch (error) {
      console.error('[VIDEO_SERVICE] Create video error:', error);
      throw error;
    }
  }

  /**
   * Get all videos for a user
   */
  async getUserVideos(userId, filters = {}) {
    try {
      const where = {
        userId,
        isDeleted: false
      };

      if (filters.isPublic !== undefined) {
        where.isPublic = filters.isPublic;
      }

      return await Video.findAll({ where });
    } catch (error) {
      console.error('Get user videos error:', error);
      throw error;
    }
  }

  /**
   * Get all public videos
   */
  async getPublicVideos(filters = {}) {
    try {
      const where = {
        isPublic: true,
        isDeleted: false
      };

      return await Video.findAll({ where });
    } catch (error) {
      console.error('Get public videos error:', error);
      throw error;
    }
  }

  /**
   * Get single video
   */
  async getVideo(videoId) {
    try {
      return await Video.findByPk(videoId);
    } catch (error) {
      console.error('Get video error:', error);
      throw error;
    }
  }

  /**
   * Update video metadata
   */
  async updateVideo(videoId, userId, updateData) {
    try {
      // Verify ownership
      const video = await Video.findByPk(videoId);
      if (!video || video.userId !== userId) {
        throw new Error('Not authorized to update this video');
      }

      return await Video.update(updateData, { where: { id: videoId } });
    } catch (error) {
      console.error('Update video error:', error);
      throw error;
    }
  }

  /**
   * Toggle video public/private
   */
  async toggleVideoPrivacy(videoId, userId) {
    try {
      const video = await Video.findByPk(videoId);
      if (!video || video.userId !== userId) {
        throw new Error('Not authorized to update this video');
      }

      return await Video.update(
        { isPublic: !video.isPublic },
        { where: { id: videoId } }
      );
    } catch (error) {
      console.error('Toggle privacy error:', error);
      throw error;
    }
  }

  /**
   * Mark video as downloaded
   */
  async markVideoDownloaded(videoId, userId) {
    try {
      const video = await Video.findByPk(videoId);
      if (!video || video.userId !== userId) {
        throw new Error('Not authorized to update this video');
      }

      return await Video.update(
        { isDownloaded: true },
        { where: { id: videoId } }
      );
    } catch (error) {
      console.error('Mark downloaded error:', error);
      throw error;
    }
  }

  /**
   * Soft delete video
   */
  async softDeleteVideo(videoId, userId) {
    try {
      const video = await Video.findByPk(videoId);
      if (!video || video.userId !== userId) {
        throw new Error('Not authorized to delete this video');
      }

      await Video.softDelete(videoId);
      return { success: true, message: 'Video deleted' };
    } catch (error) {
      console.error('Soft delete error:', error);
      throw error;
    }
  }

  /**
   * Permanent delete video (only for superadmin)
   */
  async permanentDeleteVideo(videoId, userId, userRole) {
    try {
      if (userRole !== 'superadmin') {
        throw new Error('Only superadmin can permanently delete videos');
      }

      const video = await Video.findByPk(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Delete from Cloud Storage if file exists
      if (video.cloudStoragePath) {
        try {
          await storageService.deleteFile(video.cloudStoragePath);
        } catch (err) {
          console.warn('[VIDEO_SERVICE] Could not delete file from storage:', err.message);
        }
      }

      // Delete captions associated with video
      const Caption = require('../models/Caption');
      const captions = await Caption.findAll({ where: { videoId } });
      for (const caption of captions) {
        await Caption.destroy({ where: { id: caption.id } });
      }

      // Delete video from Firestore
      await Video.destroy({ where: { id: videoId } });
      return { success: true, message: 'Video permanently deleted' };
    } catch (error) {
      console.error('Permanent delete error:', error);
      throw error;
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(videoId) {
    try {
      await Video.incrementViewCount(videoId);
    } catch (error) {
      console.error('Increment view count error:', error);
    }
  }

  /**
   * Publish transcoding event to Pub/Sub
   */
  async publishTranscodingEvent(videoId, eventType) {
    try {
      // Pub/Sub integration can be added here if needed
      console.log(`[VIDEO_SERVICE] Event: ${eventType} for video ${videoId}`);
    } catch (error) {
      console.error('Publish event error:', error);
    }
  }

  /**
   * Search videos
   */
  async searchVideos(query, userId = null) {
    try {
      const results = await Video.search(query, { limit: 50 });
      
      // If userId provided, filter to user's videos and public videos
      if (userId) {
        return results.filter(v => v.userId === userId || v.isPublic);
      }
      
      return results.filter(v => v.isPublic);
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
}

module.exports = new VideoService();
