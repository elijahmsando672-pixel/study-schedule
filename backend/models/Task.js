const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
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
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  subject: {
    type: DataTypes.STRING(50),
    defaultValue: 'General'
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  date: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  startTime: {
    type: DataTypes.STRING(5),
    defaultValue: ''
  },
  endTime: {
    type: DataTypes.STRING(5),
    defaultValue: ''
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in-progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  reminder: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  completedAt: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recurrencePattern: {
    type: DataTypes.ENUM('daily', 'weekly', 'biweekly', 'monthly'),
    defaultValue: null
  },
  recurrenceEndDate: {
    type: DataTypes.STRING(10),
    defaultValue: null
  },
  recurrenceParentId: {
    type: DataTypes.INTEGER,
    defaultValue: null
  }
}, {
  tableName: 'tasks',
  timestamps: true,
  underscored: true
});

module.exports = Task;
