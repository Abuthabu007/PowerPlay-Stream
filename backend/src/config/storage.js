const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

// Initialize Google Cloud Storage
let storage;
let bucket;

try {
  storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GCP_KEY_FILE
  });

  bucket = storage.bucket(process.env.GCS_BUCKET_NAME || 'powerplay-stream-bucket');
} catch (error) {
  // In development without GCP credentials, create mock storage
  if (process.env.DISABLE_IAP_VALIDATION === 'true') {
    console.warn('[WARNING] Google Cloud Storage not available in development mode. File uploads will be saved locally.');
    storage = null;
    bucket = null;
  } else {
    throw error;
  }
}

module.exports = {
  storage,
  bucket
};
