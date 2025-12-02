const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || 'powerplay-stream-bucket');

module.exports = {
  storage,
  bucket
};
