const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const { iapAuth } = require('./middleware/auth');
const videoRoutes = require('./routes/videoRoutes');
const searchRoutes = require('./routes/searchRoutes');

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
  'https://looply-frontend-687745071178.us-central1.run.app',  // Production frontend Cloud Run
  'https://looply.co.in',             // Custom domain
  'https://www.looply.co.in',         // Custom domain www
  process.env.FRONTEND_URL            // Production frontend URL from env var
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
      callback(null, false);
    }
  },
  credentials: 'include',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Type', 'Content-Length'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Middleware
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(cors(corsOptions));

// Explicitly handle all preflight requests BEFORE any routes
app.options('*', cors(corsOptions));

// Disable caching for API responses
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// Serve uploaded files (no auth required)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend static files (CSS, JS, images) - no auth required
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// API Routes (auth middleware applied at route level for public routes)
app.use('/api/videos', videoRoutes);
app.use('/api/search', searchRoutes);

// Health check - simple and fast (public endpoint)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Health check under /api path (for frontend compatibility)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// SPA fallback: serve index.html for all non-API routes
app.get('/*', (req, res) => {
  // Don't serve index.html for API calls (they should 404)
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  }
});


// Get IAP user info - endpoint that works with IAP authentication
// When IAP is enabled, the Authorization header is injected by GCP with a valid JWT
app.get('/api/user-info', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('[USER-INFO] Request started');
    
    const authHeader = req.headers.authorization;
    
    // If no Authorization header, return null user quickly
    if (!authHeader) {
      console.log('[USER-INFO] No auth header - returning null');
      res.set('Content-Type', 'application/json');
      return res.json(null);
    }

    console.log('[USER-INFO] Auth header present, parsing...');
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('[USER-INFO] Invalid auth format - returning null');
      res.set('Content-Type', 'application/json');
      return res.json(null);
    }

    const iapJwt = parts[1];
    console.log('[USER-INFO] JWT token length:', iapJwt.length);

    // Decode JWT or base64 token
    const jwt = require('jsonwebtoken');
    let payload = null;

    // Try to decode as JWT first (for real IAP tokens)
    try {
      const decoded = jwt.decode(iapJwt, { complete: true });
      if (decoded && decoded.payload) {
        payload = decoded.payload;
        console.log('[USER-INFO] Decoded JWT successfully');
      }
    } catch (jwtErr) {
      console.warn('[USER-INFO] Failed to decode as JWT:', jwtErr.message);
    }

    // Fallback: Try to decode as base64 (for development mock tokens)
    if (!payload) {
      try {
        const decoded = Buffer.from(iapJwt, 'base64').toString('utf-8');
        payload = JSON.parse(decoded);
        console.log('[USER-INFO] Decoded base64 mock token successfully');
      } catch (b64Err) {
        console.error('[USER-INFO] Failed to decode token:', b64Err.message);
        res.set('Content-Type', 'application/json');
        return res.json(null);
      }
    }

    if (!payload) {
      console.log('[USER-INFO] No payload extracted - returning null');
      res.set('Content-Type', 'application/json');
      return res.json(null);
    }

    console.log('[USER-INFO] Token payload extracted in', Date.now() - startTime, 'ms');
    
    const userData = {
      id: payload.sub || 'unknown',
      email: payload.email || 'unknown@example.com',
      name: payload.name || payload.email || 'Unknown User',
      iapId: payload.sub,
      role: payload.role || 'user'
    };
    
    console.log('[USER-INFO] Returning user data in', Date.now() - startTime, 'ms:', userData.email, '(' + userData.name + ')');
    res.set('Content-Type', 'application/json');
    res.json(userData);
  } catch (error) {
    console.error('[USER-INFO] Error in', Date.now() - startTime, 'ms:', error.message);
    res.status(500).set('Content-Type', 'application/json').json(null);
  }
});

// Get Current User Info (alias endpoint)
app.get('/api/users/me/info', (req, res) => {
  try {
    if (req.user) {
      res.json({
        success: true,
        data: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role
        }
      });
    } else if (process.env.DISABLE_IAP_VALIDATION === 'true') {
      res.json({
        success: true,
        data: {
          id: 'dev-user-123',
          email: 'dev@example.com',
          name: 'Development User',
          role: 'superadmin'
        }
      });
    } else {
      res.status(401).json({ success: false, error: 'User not authenticated' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use(errorHandler);

// Start server (no DB logic)
console.log('[STARTUP] Process starting...');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[STARTUP] ✅ HTTP Server listening on port ${PORT}`);
});
