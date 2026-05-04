const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Reminder = sequelize.define('Reminder', {
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
    allowNull: true,
    references: {
      model: 'subjects',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  time: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  daysOfWeek: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const raw = this.getDataValue('daysOfWeek');
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('daysOfWeek', JSON.stringify(value));
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'reminders',
  timestamps: true,
  underscored: true
});

module.exports = Reminder;
