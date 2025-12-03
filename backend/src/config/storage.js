const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

// Initialize Google Cloud Storage
let storage;
let bucket;
let storageAvailable = false;

try {
  // Only initialize storage if we have GCP credentials
  if (process.env.GCP_PROJECT_ID && process.env.GCP_KEY_FILE) {
    storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCP_KEY_FILE
    });

    bucket = storage.bucket(process.env.GCS_BUCKET_NAME || 'powerplay-stream-bucket');
    storageAvailable = true;
  } else {
    console.warn('[WARNING] GCP credentials not configured. Using local file storage.');
    storage = null;
    bucket = null;
  }
} catch (error) {
  console.warn('[WARNING] Google Cloud Storage initialization failed:', error.message);
  console.warn('Falling back to local file storage.');
  storage = null;
  bucket = null;
}

module.exports = {
  storage,
  bucket,
  storageAvailable
};
