const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { iapAuth, authorize } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads with 500MB limit
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
});

// All video routes require authentication
router.use(iapAuth);

/**
 * Video Upload
 */
router.post('/upload',
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  videoController.uploadVideo
);

/**
 * Upload Caption
 */
router.post('/:videoId/caption',
  upload.single('caption'),
  videoController.uploadCaption
);

/**
 * Get User's Videos
 */
router.get('/my-videos', videoController.getUserVideos);

/**
 * Get Single Video
 */
router.get('/:videoId', videoController.getVideo);

/**
 * Toggle Video Privacy
 */
router.patch('/:videoId/privacy', videoController.togglePrivacy);

/**
 * Mark as Downloaded/Undownloaded
 */
router.patch('/:videoId/downloaded', videoController.toggleDownloaded);

/**
 * Get Download URL
 */
router.get('/:videoId/download', videoController.getDownloadUrl);

/**
 * Soft Delete Video
 */
router.delete('/:videoId', videoController.softDelete);

/**
 * Permanent Delete Video (Superadmin only)
 */
router.delete('/:videoId/permanent', 
  authorize(['superadmin']),
  videoController.permanentDelete
);

/**
 * Search Videos
 */
router.get('/search/query', videoController.search);

/**
 * Public Videos (no auth required)
 */
router.get('/public/list', 
  (req, res, next) => {
    // Skip auth for public videos
    next();
  },
  videoController.getPublicVideos
);

module.exports = router;
