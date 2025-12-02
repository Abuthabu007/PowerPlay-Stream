const vertexAiService = require('../services/vertexAiService');

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

      const suggestions = await vertexAiService.getSuggestions(query, 5);

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
   * Perform semantic search
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

      const results = await vertexAiService.semanticSearch(query, 10);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Semantic search error:', error);
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

      const similarVideos = await vertexAiService.findSimilarVideos(videoId, 5);

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
