const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Video = require('./Video');

const Caption = sequelize.define('Caption', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  videoId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Video,
      key: 'id'
    }
  },
  language: {
    type: DataTypes.ENUM('english', 'spanish', 'turkish', 'arabic', 'french'),
    allowNull: false
  },
  languageCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  captionUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cloudStoragePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileSize: {
    type: DataTypes.BIGINT
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'captions',
  timestamps: true
});

Caption.belongsTo(Video, { foreignKey: 'videoId' });
Video.hasMany(Caption, { foreignKey: 'videoId' });

module.exports = Caption;
