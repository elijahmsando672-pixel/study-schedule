const { sequelize } = require('../config/database');
const User = require('../models/User');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const StudySession = require('../models/StudySession');
const Subject = require('../models/Subject');
const ScheduleSlot = require('../models/ScheduleSlot');
const Reminder = require('../models/Reminder');

User.hasMany(Task, { foreignKey: 'userId', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Goal, { foreignKey: 'userId', as: 'goals' });
Goal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(StudySession, { foreignKey: 'userId', as: 'sessions' });
StudySession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Subject, { foreignKey: 'userId', as: 'subjects' });
Subject.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ScheduleSlot, { foreignKey: 'userId', as: 'scheduleSlots' });
ScheduleSlot.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Reminder, { foreignKey: 'userId', as: 'reminders' });
Reminder.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Task.hasMany(StudySession, { foreignKey: 'taskId', as: 'sessions' });
StudySession.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

Subject.hasMany(ScheduleSlot, { foreignKey: 'subjectId', as: 'scheduleSlots' });
ScheduleSlot.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

Subject.hasMany(Reminder, { foreignKey: 'subjectId', as: 'reminders' });
Reminder.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

module.exports = {
  sequelize,
  User,
  Task,
  Goal,
  StudySession,
  Subject,
  ScheduleSlot,
  Reminder
};
