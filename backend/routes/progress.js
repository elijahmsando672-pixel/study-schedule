const express = require('express');
const { Op } = require('sequelize');
const StudySession = require('../models/StudySession');
const Subject = require('../models/Subject');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/weekly', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const sessions = await StudySession.findAll({
      where: {
        userId,
        startTime: { [Op.between]: [start, now] }
      },
    });

    const byDate = {};
    sessions.forEach(s => {
      const dateStr = new Date(s.startTime).toISOString().split('T')[0];
      byDate[dateStr] = (byDate[dateStr] || 0) + s.duration;
    });

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    const startDate = new Date(start);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        dayLabel: DAY_LABELS[d.getDay()],
        minutes: byDate[dateStr] || 0,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/by-subject', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const subjects = await Subject.findAll({ where: { userId } });

    const sessions = await StudySession.findAll({
      where: {
        userId,
        startTime: { [Op.gte]: weekStart }
      },
    });

    const minutesBySubject = {};
    sessions.forEach(s => {
      const subjectName = s.subject || 'General';
      minutesBySubject[subjectName] = (minutesBySubject[subjectName] || 0) + s.duration;
    });

    const result = subjects.map(subject => {
      const minutesThisWeek = minutesBySubject[subject.name] || 0;
      const goalMinutesPerWeek = subject.targetHours * 60;
      const percent = goalMinutesPerWeek > 0
        ? Math.min(100, Math.round((minutesThisWeek / goalMinutesPerWeek) * 100))
        : 0;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        color: subject.color,
        minutesThisWeek,
        goalMinutesPerWeek,
        percent,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
