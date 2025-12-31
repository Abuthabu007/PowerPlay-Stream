const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { iapAuth } = require('../middleware/auth');

/**
 * PROTECTED ROUTES - IAP authentication required
 */
router.use(iapAuth);

/**
 * Get search suggestions (auto-complete)
 */
router.get('/suggestions', searchController.getSuggestions);

/**
 * Semantic search
 */
router.get('/semantic', searchController.semanticSearch);

/**
 * Find similar videos
 */
router.get('/:videoId/similar', searchController.findSimilar);

module.exports = router;
