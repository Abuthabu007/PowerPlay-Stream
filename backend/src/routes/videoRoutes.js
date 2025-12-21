const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { iapAuth, authorize } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
});

/**
 * PUBLIC ROUTES (no auth required)
 * These must come FIRST, before parameterized routes like /:videoId
 */

// Get Public Videos List
router.get('/public/list', videoController.getPublicVideos);

// Search Videos
router.get('/search/query', videoController.search);

/**
 * PROTECTED ROUTES (auth required)
 * Apply auth middleware to all routes below
 */
router.use(iapAuth);

// Video Upload
router.post('/upload',
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  videoController.uploadVideo
);

// Chunked Video Upload (for videos >30MB)
router.post('/upload-chunk',
  upload.single('chunk'),
  videoController.uploadVideoChunk
);

// Upload Caption
router.post('/:videoId/caption',
  upload.single('caption'),
  videoController.uploadCaption
);

// Get User's Videos
router.get('/my-videos', videoController.getUserVideos);

/**
 * PARAMETERIZED ROUTES (these come LAST to avoid conflicts)
 */

// Get Single Video
router.get('/:videoId', videoController.getVideo);

// Toggle Video Privacy
router.patch('/:videoId/privacy', videoController.togglePrivacy);

// Mark as Downloaded/Undownloaded
router.patch('/:videoId/downloaded', videoController.toggleDownloaded);

// Get Download URL
router.get('/:videoId/download', videoController.getDownloadUrl);

// Soft Delete Video
router.delete('/:videoId', videoController.softDelete);

// Permanent Delete Video (Superadmin only)
router.delete('/:videoId/permanent',
  authorize(['superadmin']),
  videoController.permanentDelete
);

module.exports = router;
