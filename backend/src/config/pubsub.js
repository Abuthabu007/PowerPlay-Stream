const { PubSub } = require('@google-cloud/pubsub');
require('dotenv').config();

// Initialize Pub/Sub
const pubsub = new PubSub({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE
});

const topicName = process.env.PUBSUB_TOPIC || 'video-transcoding-events';
const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || 'video-transcoding-subscription';

module.exports = {
  pubsub,
  topicName,
  subscriptionName
};
