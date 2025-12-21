const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const { iapAuth } = require('./middleware/auth');
const videoRoutes = require('./routes/videoRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Log startup info
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`DISABLE_IAP_VALIDATION: ${process.env.DISABLE_IAP_VALIDATION}`);
console.log(`PORT: ${PORT}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set (development)'}`);

// CORS Configuration for microservices
const allowedOrigins = [
  'http://localhost:3000',           // Local development
  'http://localhost:8080',           // Docker local
  'https://looply-frontend-687745071178.us-central1.run.app',  // Production frontend
  process.env.FRONTEND_URL           // Production frontend URL from env var
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      console.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(cors(corsOptions));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/videos', videoRoutes);


// Health check - simple and fast
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Get IAP user info (to be refactored for Firestore-based user info)
app.get('/api/user-info', iapAuth, (req, res) => {
  try {
    if (req.user) {
      res.json({
        email: req.user.email,
        name: req.user.name,
        iapId: req.user.iapId
      });
    } else {
      res.status(401).json({ error: 'User not authenticated' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(process.env.PUBLIC_PATH, 'index.html'));
});


// Error handler
app.use(errorHandler);

// Start server (no DB logic)
console.log('[STARTUP] Process starting...');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[STARTUP] ✅ HTTP Server listening on port ${PORT}`);
});
