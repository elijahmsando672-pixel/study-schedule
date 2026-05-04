const express = require('express');
const Subject = require('../models/Subject');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const subject = await Subject.create({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const subject = await Subject.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await subject.update(req.body);
    res.json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const subject = await Subject.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await Subject.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
