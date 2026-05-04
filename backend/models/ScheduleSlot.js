const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ScheduleSlot = sequelize.define('ScheduleSlot', {
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
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subjects',
      key: 'id'
    }
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 6
    }
  },
  startTime: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  endTime: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'schedule_slots',
  timestamps: true,
  underscored: true
});

module.exports = ScheduleSlot;
