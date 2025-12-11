const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

/**
 * User Firestore Document Structure
 * Collection: users
 * Document ID: uid (Firestore auto-generated or custom)
 * Fields:
 *   - id: UUID
 *   - email: string
 *   - name: string
 *   - iapId: string (Identity-Aware Proxy identity)
 *   - role: enum ('user' | 'admin' | 'superadmin')
 *   - isActive: boolean
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 */

const userCollection = 'users';

const User = {
  /**
   * Create a new user document
   */
  async create(data) {
    const userId = data.id || uuidv4();
    const docRef = db.collection(userCollection).doc(userId);
    
    const userData = {
      id: userId,
      email: data.email,
      name: data.name,
      iapId: data.iapId,
      role: data.role || 'user',
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await docRef.set(userData);
    return { id: userId, ...userData };
  },

  /**
   * Get user by ID
   */
  async findByPk(userId) {
    const doc = await db.collection(userCollection).doc(userId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  /**
   * Get user by email or iapId
   */
  async findOne(where) {
    if (where.email) {
      const snapshot = await db.collection(userCollection)
        .where('email', '==', where.email)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    if (where.iapId) {
      const snapshot = await db.collection(userCollection)
        .where('iapId', '==', where.iapId)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  },

  /**
   * Update user
   */
  async update(data, options) {
    const userId = options.where.id;
    const docRef = db.collection(userCollection).doc(userId);
    
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    await docRef.update(updateData);
    return { id: userId, ...updateData };
  },

  /**
   * Delete user
   */
  async destroy(options) {
    const userId = options.where.id;
    await db.collection(userCollection).doc(userId).delete();
  },

  /**
   * Get all users
   */
  async findAll(options = {}) {
    let query = db.collection(userCollection);
    
    if (options.where) {
      if (options.where.role) {
        query = query.where('role', '==', options.where.role);
      }
      if (options.where.isActive !== undefined) {
        query = query.where('isActive', '==', options.where.isActive);
      }
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

module.exports = User;
