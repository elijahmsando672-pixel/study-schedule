const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const Task = require('../models/Task');
const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');
const Subject = require('../models/Subject');
const ScheduleSlot = require('../models/ScheduleSlot');
const Reminder = require('../models/Reminder');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const [
      todaySessions,
      weekSessions,
      allTasks,
      allSubjects,
      activeReminders,
      activeGoals,
    ] = await Promise.all([
      StudySession.findAll({ where: { userId, date: today } }),
      StudySession.findAll({ where: { userId, date: { [Op.gte]: weekStartStr } } }),
      Task.findAll({ where: { userId } }),
      Subject.findAll({ where: { userId } }),
      Reminder.findAll({ where: { userId, isActive: true } }),
      Goal.findAll({ where: { userId, status: 'active' } }),
    ]);

    const minutesToday = todaySessions.reduce((acc, s) => acc + s.duration, 0);
    const minutesThisWeek = weekSessions.reduce((acc, s) => acc + s.duration, 0);
    const sessionsThisWeek = weekSessions.length;

    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const streak = calculateStreak(completedTasks);

    const weeklyGoalMinutes = activeGoals.reduce((acc, g) => {
      const subject = allSubjects.find(s => s.id === g.subjectId);
      return acc + (subject ? subject.targetHours * 60 : 0);
    }, 0) || 600;

    res.json({
      minutesToday,
      minutesThisWeek,
      sessionsThisWeek,
      currentStreakDays: streak,
      weeklyGoalMinutes,
      subjectCount: allSubjects.length,
      upcomingReminderCount: activeReminders.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/today', async (req, res) => {
  try {
    const userId = req.user.id;
    const todayDow = new Date().getDay();

    const slots = await ScheduleSlot.findAll({
      where: { userId, dayOfWeek: todayDow, isActive: true },
      include: [{ model: Subject, as: 'subject', attributes: ['name', 'color'] }],
      order: [['startTime', 'ASC']],
    });

    const result = slots.map(slot => ({
      id: slot.id,
      subjectId: slot.subjectId,
      subjectName: slot.subject?.name || 'Unknown',
      subjectColor: slot.subject?.color || '#6366F1',
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function calculateStreak(completedTasks) {
  if (completedTasks.length === 0) return 0;

  const completedDates = new Set(
    completedTasks
      .filter(t => t.completedAt)
      .map(t => {
        const d = new Date(t.completedAt);
        return d.toISOString().split('T')[0];
      })
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    if (completedDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

module.exports = router;
