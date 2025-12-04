const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const sequelize = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const videoRoutes = require('./routes/videoRoutes');
const searchRoutes = require('./routes/searchRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Log startup info
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`DISABLE_IAP_VALIDATION: ${process.env.DISABLE_IAP_VALIDATION}`);
console.log(`PORT: ${PORT}`);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static frontend files
const publicPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(publicPath));

// API Routes
app.use('/api/videos', videoRoutes);
app.use('/api/search', searchRoutes);

// Health check - simple and fast, doesn't depend on database
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get IAP user info
app.get('/api/user-info', (req, res) => {
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
  try {
    await sequelize.authenticate();
    console.log('Database connection established');

    // Sync models
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database models synced');
  } catch (error) {
    console.warn('Database initialization warning (app will continue with fallback):', error.message);
  }

  // Start listening regardless of database status
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
