const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const sequelize = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { iapAuth } = require('./middleware/auth');
const videoRoutes = require('./routes/videoRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Log startup info
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`DISABLE_IAP_VALIDATION: ${process.env.DISABLE_IAP_VALIDATION}`);
console.log(`PORT: ${PORT}`);

// Middleware
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(cors());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static frontend files
const publicPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(publicPath));

// API Routes
app.use('/api/videos', videoRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);

// Health check - simple and fast, doesn't depend on database
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get IAP user info
app.get('/api/user-info', iapAuth, (req, res) => {
  try {
    if (req.user) {
      res.json({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        iapId: req.user.iapId,
        role: req.user.role || 'user'
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
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handler
app.use(errorHandler);

// Database sync and server start
async function startServer() {
  const startTime = Date.now();
  console.log('[STARTUP] ========== SERVER STARTUP BEGIN ==========');
  console.log('[STARTUP] Node version:', process.version);
  console.log('[STARTUP] Environment:', process.env.NODE_ENV);
  console.log('[STARTUP] Port:', PORT);
  console.log('[STARTUP] IAP Validation:', process.env.DISABLE_IAP_VALIDATION);
  
  // Start the server FIRST before any database operations
  // This ensures health checks pass immediately
  const server = app.listen(PORT, '0.0.0.0', () => {
    const elapsedTime = Date.now() - startTime;
    console.log(`[STARTUP] ✅ HTTP Server listening on port ${PORT} (${elapsedTime}ms)`);
    console.log('[STARTUP] ========== SERVER STARTUP COMPLETE ==========');
  });

  // Handle server errors
  server.on('error', (err) => {
    console.error('[STARTUP] ❌ Server error:', err.message);
    process.exit(1);
  });

  // Initialize database in the background (non-blocking)
  setImmediate(async () => {
    try {
      console.log('[DB] Starting database initialization (non-blocking)...');
      
      // Set timeout for DB operations
      const dbTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 20000)
      );
      
      const dbOps = Promise.all([
        sequelize.authenticate(),
        sequelize.sync({ alter: false, logging: false }) // Don't alter in production
      ]);
      
      await Promise.race([dbOps, dbTimeout]);
      console.log('[DB] ✅ Database connected and synced');
    } catch (error) {
      console.warn('[DB] ⚠️  Database initialization failed:', error.message);
      console.warn('[DB] App will continue with local SQLite fallback');
    }
  });
}

console.log('[STARTUP] Process starting...');
startServer();
