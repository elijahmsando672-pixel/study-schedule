const express = require('express');
const Reminder = require('../models/Reminder');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const reminders = await Reminder.findAll({
      where: { userId: req.user.id },
      order: [['time', 'ASC']],
    });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, subjectId, time, daysOfWeek, isActive } = req.body;

    if (!title || !time || !daysOfWeek) {
      return res.status(400).json({ message: 'Title, time, and daysOfWeek are required' });
    }

    const reminder = await Reminder.create({
      title,
      subjectId: subjectId || null,
      time,
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : JSON.parse(daysOfWeek),
      isActive: isActive !== undefined ? isActive : true,
      userId: req.user.id,
    });

    res.status(201).json(reminder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const updateData = { ...req.body };
    if (updateData.daysOfWeek && typeof updateData.daysOfWeek === 'string') {
      try {
        updateData.daysOfWeek = JSON.parse(updateData.daysOfWeek);
      } catch {
      }
    }

    await reminder.update(updateData);
    res.json(reminder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    await Reminder.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
