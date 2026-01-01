const searchService = require('../services/searchService');

class SearchController {
  /**
   * Get search suggestions with auto-complete
   */
  async getSuggestions(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.length < 1) {
        return res.json({
          success: true,
          data: []
        });
      }

      const suggestions = await searchService.getSuggestions(query, 5);

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Get suggestions error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Perform search
   */
  async semanticSearch(req, res) {
    try {
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const results = await searchService.search(query, 10);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Find similar videos
   */
  async findSimilar(req, res) {
    try {
      const { videoId } = req.params;

      const similarVideos = await searchService.findSimilarVideos(videoId, 5);

      res.json({
        success: true,
        data: similarVideos
      });
    } catch (error) {
      console.error('Find similar error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new SearchController();
