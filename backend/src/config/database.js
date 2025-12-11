const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Try to initialize with service account from environment variable or file
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json';
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
      projectId: process.env.GCP_PROJECT_ID
    });
  } catch (err) {
    // If service account file not found, initialize with default credentials
    // (will use GOOGLE_APPLICATION_CREDENTIALS env variable)
    admin.initializeApp({
      projectId: process.env.GCP_PROJECT_ID
    });
  }
}

// Get Firestore instance
const db = getFirestore();

// Enable offline persistence for development (optional)
if (process.env.NODE_ENV === 'development') {
  db.settings({ experimentalForceLongPolling: true });
}

console.log(`Firestore initialized for project: ${process.env.GCP_PROJECT_ID || 'default'}`);

module.exports = { admin, db };
