const aiplatform = require('@google-cloud/aiplatform');
require('dotenv').config();

const { PredictionServiceClient } = aiplatform.v1;

// Initialize Vertex AI
let predictionServiceClient;

try {
  predictionServiceClient = new PredictionServiceClient({
    apiEndpoint: `${process.env.GCP_REGION}-aiplatform.googleapis.com`,
    credentials: {
      project_id: process.env.GCP_PROJECT_ID
    }
  });
} catch (error) {
  // In development without GCP credentials, create mock client
  if (process.env.DISABLE_IAP_VALIDATION === 'true') {
    console.warn('[WARNING] Vertex AI not available in development mode. Search/analysis features will use mocks.');
    predictionServiceClient = null;
  } else {
    throw error;
  }
}

module.exports = {
  predictionServiceClient,
  modelId: process.env.VERTEX_AI_MODEL_ID || 'text-search-model'
};
