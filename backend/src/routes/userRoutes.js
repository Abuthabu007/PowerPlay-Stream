const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { iapAuth, authorize } = require('../middleware/auth');

// All user management routes require authentication
router.use(iapAuth);

/**
 * Get all users (admin and superadmin only)
 */
router.get('/', authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'name', 'role', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get single user by ID
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'name', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Update user role (superadmin only)
 */
router.patch('/:userId/role', authorize(['superadmin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: user, admin, superadmin'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ role });

    res.json({
      success: true,
      message: `User ${user.email} role updated to ${role}`,
      data: user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Deactivate user (admin and superadmin)
 */
router.patch('/:userId/deactivate', authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    // Superadmin can deactivate anyone, admin can only deactivate users
    if (requestingUser.role === 'admin') {
      const targetUser = await User.findByPk(userId);
      if (targetUser && targetUser.role !== 'user') {
        return res.status(403).json({
          success: false,
          message: 'Admin can only deactivate users, not admins or superadmins'
        });
      }
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ isActive: false });

    res.json({
      success: true,
      message: `User ${user.email} deactivated`,
      data: user
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Reactivate user (admin and superadmin)
 */
router.patch('/:userId/reactivate', authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ isActive: true });

    res.json({
      success: true,
      message: `User ${user.email} reactivated`,
      data: user
    });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get current user info
 */
router.get('/me/info', async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
