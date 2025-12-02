const { Sequelize } = require('sequelize');
require('dotenv').config();

// Cloud SQL configuration
const sequelize = new Sequelize({
  host: process.env.CLOUD_SQL_HOST || 'localhost',
  username: process.env.CLOUD_SQL_USER || 'root',
  password: process.env.CLOUD_SQL_PASSWORD || '',
  database: process.env.CLOUD_SQL_DATABASE || 'powerplay_stream',
  dialect: 'mysql',
  port: process.env.CLOUD_SQL_PORT || 3306,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
