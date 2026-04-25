const express = require('express');
const { Op } = require('sequelize');
const Task = require('../models/Task');
const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/overview', async (req, res) => {
  try {
    const tasks = await Task.findAll({ where: { userId: req.user.id } });
    const goals = await Goal.findAll({ where: { userId: req.user.id, status: 'active' } });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

    const completedHours = tasks
      .filter(t => t.status === 'completed')
      .reduce((acc, t) => acc + t.duration, 0) / 60;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.date === today);
    const todayCompleted = todayTasks.filter(t => t.status === 'completed').length;

    const streak = calculateStreak(tasks);

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      totalHours: '0',
      completedHours: completedHours.toFixed(1),
      completionRate,
      todayTasks: todayTasks.length,
      todayCompleted,
      streak,
      activeGoals: goals.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/weekly', async (req, res) => {
  try {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekData = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - diff + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTasks = await Task.findAll({ 
        where: { 
          userId: req.user.id, 
          date: dateStr,
          status: 'completed'
        }
      });

      const dayHours = dayTasks.reduce((acc, t) => acc + t.duration, 0) / 60;

      weekData.push({
        day: days[i],
        date: dateStr,
        tasks: dayTasks.length,
        hours: parseFloat(dayHours.toFixed(1))
      });
    }

    res.json(weekData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/subjects', async (req, res) => {
  try {
    const tasks = await Task.findAll({ where: { userId: req.user.id } });
    
    const subjectMap = {};
    tasks.forEach(task => {
      const subject = task.subject || 'General';
      if (!subjectMap[subject]) {
        subjectMap[subject] = { total: 0, completed: 0, hours: 0 };
      }
      subjectMap[subject].total += 1;
      if (task.status === 'completed') {
        subjectMap[subject].completed += 1;
        subjectMap[subject].hours += task.duration / 60;
      }
    });

    const subjects = Object.entries(subjectMap).map(([name, data]) => ({
      name,
      ...data,
      hours: parseFloat(data.hours.toFixed(1))
    }));

    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function calculateStreak(tasks) {
  const completedTasks = tasks.filter(t => t.status === 'completed');
  if (completedTasks.length === 0) return 0;

  let streak = 0;
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const hasTodayTask = completedTasks.some(t => t.date === today);
  if (!hasTodayTask) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const hasYesterday = completedTasks.some(t => t.date === yesterdayStr);
    if (!hasYesterday) return 0;
  }

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasTask = completedTasks.some(t => t.date === dateStr);
    if (hasTask) streak++;
    else if (i > 0) break;
  }

  return streak;
}

module.exports = router;