const Video = require('../models/Video');
const { db } = require('../config/database');

/**
 * Metadata-based search service using Firestore queries
 * Searches across title, description, and tags
 */
class SearchService {
  /**
   * Search videos by query (searches title, description, and tags using Firestore queries)
   */
  async search(query, limit = 10) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const searchTerm = query.toLowerCase().trim();
      const searchWords = searchTerm.split(' ').filter(w => w.length > 0);

      // Base query for public, non-deleted videos
      let baseQuery = db.collection('videos')
        .where('isDeleted', '==', false)
        .where('isPublic', '==', true);

      // Fetch videos for processing (Firestore doesn't support full-text search)
      const snapshot = await baseQuery.limit(limit * 5).get();
      const allVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Score videos based on matches across all fields
      const scored = allVideos
        .map(video => {
          let score = 0;
          const titleLower = video.title.toLowerCase();
          const descriptionLower = (video.description || '').toLowerCase();
          const tagsLower = (video.tags || []).map(t => t.toLowerCase());

          // ===== TITLE MATCHING (Highest Priority) =====
          if (titleLower.includes(searchTerm)) {
            score += 15;
            // Exact match at start
            if (titleLower.startsWith(searchTerm)) {
              score += 10;
            }
          }

          // Check individual words in title
          searchWords.forEach(word => {
            if (titleLower.includes(word)) {
              score += 5;
              if (titleLower.startsWith(word)) {
                score += 3;
              }
            }
          });

          // ===== TAG MATCHING (High Priority) =====
          if (video.tags && Array.isArray(video.tags)) {
            // Exact tag match
            const exactTagMatches = tagsLower.filter(tag => tag === searchTerm).length;
            score += exactTagMatches * 12;

            // Partial tag matches
            const partialTagMatches = tagsLower.filter(tag =>
              tag.includes(searchTerm) && tag !== searchTerm
            ).length;
            score += partialTagMatches * 6;

            // Word-based tag matches
            searchWords.forEach(word => {
              const wordMatches = tagsLower.filter(tag => tag.includes(word)).length;
              score += wordMatches * 3;
            });
          }

          // ===== DESCRIPTION MATCHING (Medium Priority) =====
          if (descriptionLower.includes(searchTerm)) {
            score += 8;
          }

          searchWords.forEach(word => {
            if (descriptionLower.includes(word)) {
              score += 2;
            }
          });

          return { video, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => {
          // Primary: Sort by relevance score
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          // Secondary: Sort by view count (popularity)
          return b.video.viewCount - a.video.viewCount;
        })
        .slice(0, limit)
        .map(item => item.video);

      console.log(`[SEARCH] Found ${scored.length} results for "${query}"`);
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
   * Find similar videos by tags using Firestore queries
   */
  async findSimilarVideos(videoId, limit = 5) {
    try {
      const video = await Video.findByPk(videoId);

      if (!video) {
        throw new Error('Video not found');
      }

      // If no tags, return most viewed public videos
      if (!video.tags || video.tags.length === 0) {
        const query = db.collection('videos')
          .where('isDeleted', '==', false)
          .where('isPublic', '==', true)
          .orderBy('viewCount', 'desc')
          .limit(limit + 1); // +1 to exclude the source video

        const snapshot = await query.get();
        const videos = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(v => v.id !== videoId)
          .slice(0, limit);

        console.log(`[SIMILAR] No tags for video ${videoId}, returning top ${videos.length} popular videos`);
        return videos;
      }

      // Query videos by tags using Firestore array-contains queries
      // Note: Firestore doesn't support OR queries directly, so we fetch and filter
      const baseQuery = db.collection('videos')
        .where('isDeleted', '==', false)
        .where('isPublic', '==', true);

      const snapshot = await baseQuery.limit(limit * 10).get();
      const allVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Score videos based on matching tags
      const scored = allVideos
        .filter(v => v.id !== videoId)
        .map(candidate => {
          if (!candidate.tags || candidate.tags.length === 0) {
            return { video: candidate, score: 0 };
          }

          // Count matching tags
          const matchingTags = candidate.tags.filter(tag =>
            video.tags.includes(tag)
          ).length;

          // Calculate score based on tag overlap
          const tagOverlapPercentage = matchingTags / video.tags.length;
          const score = matchingTags * 10 + (tagOverlapPercentage * 5);

          return { video: candidate, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => {
          // Primary: Sort by matching tags
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          // Secondary: Sort by view count (popularity)
          return b.video.viewCount - a.video.viewCount;
        })
        .slice(0, limit)
        .map(item => item.video);

      console.log(`[SIMILAR] Found ${scored.length} similar videos for ${videoId}`);
      return scored;
    } catch (error) {
      console.error('Find similar videos error:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();
