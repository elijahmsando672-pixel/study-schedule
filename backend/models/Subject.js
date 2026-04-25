const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  color: {
    type: DataTypes.STRING(20),
    defaultValue: '#6366F1'
  },
  targetHours: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    validate: {
      min: 1
    }
  },
  studyGuide: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  tableName: 'subjects',
  timestamps: true,
  underscored: true
});

module.exports = Subject;
