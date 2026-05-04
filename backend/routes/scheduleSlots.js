const express = require('express');
const ScheduleSlot = require('../models/ScheduleSlot');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const slots = await ScheduleSlot.findAll({
      where: { userId: req.user.id },
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']],
    });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const slot = await ScheduleSlot.create({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(slot);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const slot = await ScheduleSlot.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!slot) {
      return res.status(404).json({ message: 'Schedule slot not found' });
    }

    await slot.update(req.body);
    res.json(slot);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const slot = await ScheduleSlot.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!slot) {
      return res.status(404).json({ message: 'Schedule slot not found' });
    }

    await ScheduleSlot.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Schedule slot deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
