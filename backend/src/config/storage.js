const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

// Initialize Google Cloud Storage
let storage;
let bucket;
let storageAvailable = false;

try {
  // Try to initialize storage - Cloud Run provides Application Default Credentials automatically
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'looply-dev-481412';
  const bucketName = process.env.GCS_BUCKET_NAME || 'looply-videos-looply-dev-481412';
  
  console.log('[STORAGE] Attempting to initialize GCS with project:', projectId, 'bucket:', bucketName);
  
  // Initialize with Application Default Credentials (works on Cloud Run automatically)
  storage = new Storage({
    projectId: projectId
  });

  bucket = storage.bucket(bucketName);
  storageAvailable = true;
  console.log('[STORAGE] Successfully initialized Google Cloud Storage');
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
