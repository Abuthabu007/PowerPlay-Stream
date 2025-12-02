const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const videoRoutes = require('./routes/videoRoutes');
const searchRoutes = require('./routes/searchRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
