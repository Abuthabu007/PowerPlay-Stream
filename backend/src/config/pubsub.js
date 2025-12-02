const { PubSub } = require('@google-cloud/pubsub');
require('dotenv').config();

// Initialize Pub/Sub
let pubsub;

try {
  pubsub = new PubSub({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GCP_KEY_FILE
  });
} catch (error) {
  // In development without GCP credentials, create mock pubsub
  if (process.env.DISABLE_IAP_VALIDATION === 'true') {
    console.warn('[WARNING] Google Cloud Pub/Sub not available in development mode.');
    pubsub = null;
  } else {
    throw error;
  }
}

const topicName = process.env.PUBSUB_TOPIC || 'video-transcoding-events';
const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || 'video-transcoding-subscription';

module.exports = {
  pubsub,
  topicName,
  subscriptionName
};
