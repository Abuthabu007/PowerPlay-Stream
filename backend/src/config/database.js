const { Sequelize } = require('sequelize');
require('dotenv').config();

// For local development, use SQLite (no setup needed)
// For production, use Cloud SQL (PostgreSQL or MySQL)

let sequelize;

if (process.env.NODE_ENV === 'production' || process.env.USE_MYSQL === 'true') {
  // Production: Cloud SQL configuration
  if (process.env.CLOUD_SQL_USER && process.env.CLOUD_SQL_HOST && process.env.CLOUD_SQL_PASSWORD) {
    // PostgreSQL (preferred for Cloud SQL)
    if (process.env.CLOUD_SQL_PORT === '5432') {
      sequelize = new Sequelize({
        host: process.env.CLOUD_SQL_HOST,
        username: process.env.CLOUD_SQL_USER,
        password: process.env.CLOUD_SQL_PASSWORD,
        database: process.env.CLOUD_SQL_DATABASE || 'video_metadata',
        port: process.env.CLOUD_SQL_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 10,
          min: 2,
          acquire: 30000,
          idle: 10000
        }
      });
    } else {
      // MySQL
      sequelize = new Sequelize({
        host: process.env.CLOUD_SQL_HOST,
        username: process.env.CLOUD_SQL_USER,
        password: process.env.CLOUD_SQL_PASSWORD,
        database: process.env.CLOUD_SQL_DATABASE || 'powerplay_stream',
        port: process.env.CLOUD_SQL_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 10,
          min: 2,
          acquire: 30000,
          idle: 10000
        }
      });
    }
  }
} else {
  // Development: SQLite (file-based, no setup needed)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './powerplay_stream.db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
}

module.exports = sequelize;
