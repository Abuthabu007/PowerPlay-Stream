const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

/**
 * Caption Firestore Document Structure
 * Collection: captions
 * Document ID: id (UUID)
 * Fields:
 *   - id: UUID
 *   - videoId: UUID (reference to videos collection)
 *   - language: enum ('english' | 'spanish' | 'turkish' | 'arabic' | 'french')
 *   - languageCode: string (e.g., 'en', 'es', 'tr', 'ar', 'fr')
 *   - captionUrl: string
 *   - cloudStoragePath: string
 *   - fileSize: number (bytes)
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 */

const captionCollection = 'captions';

const Caption = {
  /**
   * Create a new caption document
   */
  async create(data) {
    const captionId = data.id || uuidv4();
    const docRef = db.collection(captionCollection).doc(captionId);
    
    const captionData = {
      id: captionId,
      videoId: data.videoId,
      language: data.language,
      languageCode: data.languageCode,
      captionUrl: data.captionUrl,
      cloudStoragePath: data.cloudStoragePath,
      fileSize: data.fileSize || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await docRef.set(captionData);
    return { id: captionId, ...captionData };
  },

  /**
   * Get caption by ID
   */
  async findByPk(captionId) {
    const doc = await db.collection(captionCollection).doc(captionId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  /**
   * Get captions by video ID
   */
  async findAll(options = {}) {
    let query = db.collection(captionCollection);
    
    if (options.where && options.where.videoId) {
      query = query.where('videoId', '==', options.where.videoId);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Get captions by video and language
   */
  async findByVideoAndLanguage(videoId, language) {
    const snapshot = await db.collection(captionCollection)
      .where('videoId', '==', videoId)
      .where('language', '==', language)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Update caption
   */
  async update(data, options) {
    const captionId = options.where.id;
    const docRef = db.collection(captionCollection).doc(captionId);
    
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    await docRef.update(updateData);
    return { id: captionId, ...updateData };
  },

  /**
   * Delete caption
   */
  async destroy(options) {
    const captionId = options.where.id;
    await db.collection(captionCollection).doc(captionId).delete();
  }
};

module.exports = Caption;
