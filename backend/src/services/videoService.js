const Video = require('../models/Video');
const Caption = require('../models/Caption');
const User = require('../models/User');
const storageService = require('./storageService');
const { pubsub, topicName } = require('../config/pubsub');
const { v4: uuidv4 } = require('uuid');

class VideoService {
  /**
   * Create new video metadata
   */
  async createVideo(videoData) {
    try {
      const video = await Video.create({
        ...videoData,
        id: uuidv4()
      });

      // Publish event for transcoding
      await this.publishTranscodingEvent(video.id, 'video_uploaded');

      return video;
    } catch (error) {
      console.error('Create video error:', error);
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

      const videos = await Video.findAll({
        where,
        include: [{
          model: Caption,
          attributes: ['id', 'language', 'captionUrl']
        }],
        order: [['createdAt', 'DESC']],
        limit: filters.limit || 50,
        offset: filters.offset || 0
      });

      return videos;
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
      const videos = await Video.findAll({
        where: {
          isPublic: true,
          isDeleted: false
        },
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }, {
          model: Caption,
          attributes: ['id', 'language', 'captionUrl']
        }],
        order: [['createdAt', 'DESC']],
        limit: filters.limit || 50,
        offset: filters.offset || 0
      });

      return videos;
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
      const video = await Video.findByPk(videoId, {
        include: [{
          model: Caption,
          attributes: ['id', 'language', 'captionUrl']
        }]
      });

      if (!video) {
        throw new Error('Video not found');
      }

      return video;
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
      const video = await Video.findByPk(videoId);

      if (!video) {
        throw new Error('Video not found');
      }

      if (video.userId !== userId) {
        throw new Error('Unauthorized: Cannot update another user\'s video');
      }

      await video.update(updateData);
      return video;
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

      if (!video) {
        throw new Error('Video not found');
      }

      if (video.userId !== userId) {
        throw new Error('Unauthorized');
      }

      video.isPublic = !video.isPublic;
      await video.save();

      return video;
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

      if (!video) {
        throw new Error('Video not found');
      }

      if (video.userId !== userId && !video.isPublic) {
        throw new Error('Unauthorized');
      }

      video.isDownloaded = !video.isDownloaded;
      await video.save();

      return video;
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

      if (!video) {
        throw new Error('Video not found');
      }

      if (video.userId !== userId) {
        throw new Error('Unauthorized');
      }

      video.isDeleted = true;
      video.deletedAt = new Date();
      await video.save();

      return {
        success: true,
        message: `Video "${video.title}" deleted successfully`
      };
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

      // Delete from Cloud Storage
      await storageService.deleteVideoFolder(video.userId, videoId);

      // Delete metadata from Cloud SQL
      await video.destroy();

      return {
        success: true,
        message: `Video "${video.title}" permanently deleted`
      };
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
      const video = await Video.findByPk(videoId);
      if (video) {
        video.viewCount += 1;
        await video.save();
      }
    } catch (error) {
      console.error('Increment view count error:', error);
    }
  }

  /**
   * Publish transcoding event to Pub/Sub
   */
  async publishTranscodingEvent(videoId, eventType) {
    try {
      const topic = pubsub.topic(topicName);
      const data = {
        videoId,
        eventType,
        timestamp: new Date().toISOString()
      };

      const messageId = await topic.publish(
        Buffer.from(JSON.stringify(data))
      );

      console.log(`Event published with ID: ${messageId}`);
    } catch (error) {
      console.error('Publish event error:', error);
    }
  }

  /**
   * Search videos
   */
  async searchVideos(query, userId = null) {
    try {
      const where = {
        isDeleted: false,
        [require('sequelize').Op.or]: [
          { title: { [require('sequelize').Op.like]: `%${query}%` } },
          { description: { [require('sequelize').Op.like]: `%${query}%` } },
          { tags: { [require('sequelize').Op.like]: `%${query}%` } }
        ]
      };

      if (userId) {
        where[require('sequelize').Op.or].push({ userId });
      } else {
        where.isPublic = true;
      }

      const videos = await Video.findAll({
        where,
        include: [{
          model: Caption,
          attributes: ['id', 'language']
        }],
        limit: 20
      });

      return videos;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
}

module.exports = new VideoService();
