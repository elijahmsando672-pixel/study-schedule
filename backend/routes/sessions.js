const express = require('express');
const { Op } = require('sequelize');
const StudySession = require('../models/StudySession');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { subjectId, startDate, endDate } = req.query;

    const where = { userId: req.user.id };

    if (subjectId) where.subjectId = subjectId;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const sessions = await StudySession.findAll({
      where,
      order: [['date', 'DESC']],
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const session = await StudySession.create({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const session = await StudySession.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await StudySession.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
