const { Sequelize } = require('sequelize');
require('dotenv').config();

// For local development, use SQLite (no setup needed)
// For production, use Cloud SQL (PostgreSQL or MySQL)

let sequelize;

if (process.env.NODE_ENV === 'production' || process.env.USE_MYSQL === 'true') {
  // Production: Cloud SQL configuration
  // Supports both PostgreSQL and MySQL based on configuration
  const dialect = process.env.DB_DIALECT || 'postgres'; // postgres or mysql
  const port = process.env.CLOUD_SQL_PORT || (dialect === 'postgres' ? 5432 : 3306);
  
  sequelize = new Sequelize({
    host: process.env.CLOUD_SQL_HOST || 'localhost',
    username: process.env.CLOUD_SQL_USER || 'root',
    password: process.env.CLOUD_SQL_PASSWORD || '',
    database: process.env.CLOUD_SQL_DATABASE || 'powerplay_stream',
    dialect: dialect,
    port: port,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // Development: SQLite (file-based, no setup needed)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './powerplay_stream.db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
}

module.exports = sequelize;
