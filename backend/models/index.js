const { sequelize } = require('../config/database');
const User = require('../models/User');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const StudySession = require('../models/StudySession');

User.hasMany(Task, { foreignKey: 'userId', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Goal, { foreignKey: 'userId', as: 'goals' });
Goal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(StudySession, { foreignKey: 'userId', as: 'sessions' });
StudySession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Task.hasMany(StudySession, { foreignKey: 'taskId', as: 'sessions' });
StudySession.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

module.exports = {
  sequelize,
  User,
  Task,
  Goal,
  StudySession
};