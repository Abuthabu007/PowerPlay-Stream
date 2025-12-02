const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Video = sequelize.define('Video', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  thumbnailUrl: {
    type: DataTypes.STRING
  },
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER // in seconds
  },
  fileSize: {
    type: DataTypes.BIGINT
  },
  cloudStoragePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  folderPath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isDownloaded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deletedAt: {
    type: DataTypes.DATE
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  embeddedLink: {
    type: DataTypes.STRING
  },
  transcodingStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending'
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
  tableName: 'videos',
  timestamps: true
});

Video.belongsTo(User, { foreignKey: 'userId' });

module.exports = Video;
