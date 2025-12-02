const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

class UserService {
  /**
   * Get or create user from IAP token
   */
  async getOrCreateUser(iapData) {
    try {
      let user = await User.findOne({
        where: { iapId: iapData.iapId }
      });

      if (!user) {
        user = await User.create({
          id: uuidv4(),
          email: iapData.email,
          name: iapData.name,
          iapId: iapData.iapId,
          role: 'user'
        });
      }

      return user;
    } catch (error) {
      console.error('Get or create user error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId, newRole, adminRole) {
    try {
      if (adminRole !== 'superadmin') {
        throw new Error('Only superadmin can change user roles');
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.role = newRole;
      await user.save();
      return user;
    } catch (error) {
      console.error('Update user role error:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(adminRole, limit = 50, offset = 0) {
    try {
      if (adminRole !== 'superadmin') {
        throw new Error('Only superadmin can list all users');
      }

      const users = await User.findAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return users;
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
