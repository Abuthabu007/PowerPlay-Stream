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
  
  try {
    console.log('[STARTUP] Attempting database connection...');
    
    // Set a timeout for database operations
    const dbPromise = Promise.all([
      sequelize.authenticate(),
      sequelize.sync({ alter: process.env.NODE_ENV === 'development', logging: false })
    ]);
    
    // 30 second timeout for database operations
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout (30s)')), 30000)
    );
    
    await Promise.race([dbPromise, timeoutPromise]);
    
    console.log('[STARTUP] Database connection established and models synced');
  } catch (error) {
    console.warn('[STARTUP] Database initialization warning (app will continue):', error.message);
    console.warn('[STARTUP] This is expected in Cloud Run - using SQLite as fallback');
  }

  // Start listening regardless of database status
  const elapsedTime = Date.now() - startTime;
  console.log(`[STARTUP] Starting HTTP server on port ${PORT}...`);
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[STARTUP] ✅ Server running on port ${PORT} (startup took ${elapsedTime}ms)`);
  });

  // Handle server errors
  server.on('error', (err) => {
    console.error('[STARTUP] Server error:', err);
    process.exit(1);
  });
}

console.log('[STARTUP] Node process started, initializing server...');
startServer();
