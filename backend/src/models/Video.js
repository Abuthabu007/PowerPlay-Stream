const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

/**
 * Video Firestore Document Structure
 * Collection: videos
 * Document ID: id (UUID)
 * Fields:
 *   - id: UUID
 *   - userId: UUID (reference to users collection)
 *   - title: string
 *   - description: string
 *   - tags: array of strings
 *   - thumbnailUrl: string
 *   - videoUrl: string
 *   - duration: number (seconds)
 *   - fileSize: number (bytes)
 *   - cloudStoragePath: string
 *   - folderPath: string
 *   - isPublic: boolean
 *   - isDownloaded: boolean
 *   - isDeleted: boolean
 *   - deletedAt: timestamp (null if not deleted)
 *   - viewCount: number
 *   - embeddedLink: string
 *   - transcodingStatus: enum ('pending' | 'processing' | 'completed' | 'failed')
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 */

const videoCollection = 'videos';

const Video = {
  /**
   * Create a new video document
   */
  async create(data) {
    const videoId = data.id || uuidv4();
    const docRef = db.collection(videoCollection).doc(videoId);
    
    const videoData = {
      id: videoId,
      userId: data.userId,
      title: data.title,
      description: data.description || '',
      tags: data.tags || [],
      thumbnailUrl: data.thumbnailUrl || '',
      videoUrl: data.videoUrl,
      duration: data.duration || 0,
      fileSize: data.fileSize || 0,
      cloudStoragePath: data.cloudStoragePath,
      folderPath: data.folderPath,
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      isDownloaded: data.isDownloaded !== undefined ? data.isDownloaded : false,
      isDeleted: false,
      deletedAt: null,
      viewCount: 0,
      embeddedLink: data.embeddedLink || '',
      transcodingStatus: data.transcodingStatus || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await docRef.set(videoData);
    return { id: videoId, ...videoData };
  },

  /**
   * Get video by ID
   */
  async findByPk(videoId) {
    const doc = await db.collection(videoCollection).doc(videoId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  /**
   * Get videos with filters
   */
  async findAll(options = {}) {
    let query = db.collection(videoCollection);
    
    if (options.where) {
      if (options.where.userId) {
        query = query.where('userId', '==', options.where.userId);
      }
      if (options.where.isPublic !== undefined) {
        query = query.where('isPublic', '==', options.where.isPublic);
      }
      if (options.where.isDeleted !== undefined) {
        query = query.where('isDeleted', '==', options.where.isDeleted);
      }
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Search videos by title or description
   */
  async search(searchTerm, options = {}) {
    // Firestore doesn't support full-text search natively
    // This is a simple prefix search - for production, consider Algolia or similar
    const snapshot = await db.collection(videoCollection)
      .where('isDeleted', '==', false)
      .where('isPublic', '==', true)
      .limit(options.limit || 50)
      .get();
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(video => 
        video.title.toLowerCase().includes(lowerSearchTerm) ||
        video.description.toLowerCase().includes(lowerSearchTerm) ||
        (video.tags && video.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
      );
  },

  /**
   * Update video
   */
  async update(data, options) {
    const videoId = options.where.id;
    const docRef = db.collection(videoCollection).doc(videoId);
    
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    await docRef.update(updateData);
    
    // Return the complete updated document
    const updatedDoc = await docRef.get();
    return { id: videoId, ...updatedDoc.data() };
  },

  /**
   * Soft delete video
   */
  async softDelete(videoId) {
    const docRef = db.collection(videoCollection).doc(videoId);
    await docRef.update({
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date()
    });
  },

  /**
   * Get videos by user
   */
  async findByUserId(userId) {
    const snapshot = await db.collection(videoCollection)
      .where('userId', '==', userId)
      .where('isDeleted', '==', false)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Increment view count
   */
  async incrementViewCount(videoId) {
    const docRef = db.collection(videoCollection).doc(videoId);
    await docRef.update({
      viewCount: db.FieldValue.increment(1),
      updatedAt: new Date()
    });
  }
};

module.exports = Video;
