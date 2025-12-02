const aiplatform = require('@google-cloud/aiplatform');
require('dotenv').config();

const { PredictionServiceClient } = aiplatform.v1;

// Initialize Vertex AI
const predictionServiceClient = new PredictionServiceClient({
  apiEndpoint: `${process.env.GCP_REGION}-aiplatform.googleapis.com`,
  credentials: {
    project_id: process.env.GCP_PROJECT_ID
  }
});

module.exports = {
  predictionServiceClient,
  modelId: process.env.VERTEX_AI_MODEL_ID || 'text-search-model'
};
