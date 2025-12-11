const Video = require('../models/Video');

/**
 * Simple metadata-based search service using Firestore
 * No Vertex AI integration needed - uses video metadata (title, description, tags)
 */
class SearchService {
  /**
   * Search videos by query (searches title, description, and tags)
   */
  async search(query, limit = 10) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const searchTerm = query.toLowerCase().trim();

      // Get all public, non-deleted videos
      const allVideos = await Video.findAll({
        where: {
          isDeleted: false,
          isPublic: true
        },
        limit: limit * 2 // Fetch extra to account for filtering
      });

      // Client-side filtering and scoring
      const scored = allVideos
        .map(video => {
          let score = 0;

          // Title match (highest priority)
          if (video.title.toLowerCase().includes(searchTerm)) {
            score += 10;
            // Bonus if title starts with search term
            if (video.title.toLowerCase().startsWith(searchTerm)) {
              score += 5;
            }
          }

          // Description match
          if (video.description && video.description.toLowerCase().includes(searchTerm)) {
            score += 5;
          }

          // Tag match
          if (video.tags && Array.isArray(video.tags)) {
            const matchingTags = video.tags.filter(tag =>
              tag.toLowerCase().includes(searchTerm)
            ).length;
            score += matchingTags * 3;
          }

          return { video, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => {
          // Sort by score first, then by view count (popularity)
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return b.video.viewCount - a.video.viewCount;
        })
        .slice(0, limit)
        .map(item => item.video);

      return scored;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions (same as search but limited)
   */
  async getSuggestions(query, limit = 5) {
    return this.search(query, limit);
  }

  /**
   * Find similar videos by tags
   */
  async findSimilarVideos(videoId, limit = 5) {
    try {
      const video = await Video.findByPk(videoId);

      if (!video) {
        throw new Error('Video not found');
      }

      // If no tags, return most viewed public videos
      if (!video.tags || video.tags.length === 0) {
        const popularVideos = await Video.findAll({
          where: {
            isDeleted: false,
            isPublic: true
          },
          limit: limit * 2
        });

        return popularVideos
          .filter(v => v.id !== videoId)
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, limit);
      }

      // Find videos with matching tags
      const allVideos = await Video.findAll({
        where: {
          isDeleted: false,
          isPublic: true
        },
        limit: limit * 3
      });

      const scored = allVideos
        .filter(v => v.id !== videoId)
        .map(candidate => {
          if (!candidate.tags) {
            return { video: candidate, score: 0 };
          }

          // Count matching tags
          const matchingTags = candidate.tags.filter(tag =>
            video.tags.includes(tag)
          ).length;

          return {
            video: candidate,
            score: matchingTags > 0 ? matchingTags : 0
          };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.video.viewCount - a.video.viewCount;
        })
        .slice(0, limit)
        .map(item => item.video);

      return scored;
    } catch (error) {
      console.error('Find similar videos error:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();
