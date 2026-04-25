const express = require('express');
const { Op } = require('sequelize');
const Task = require('../models/Task');
const StudySession = require('../models/StudySession');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { status, priority, subject, date, startDate, endDate } = req.query;
    
    const where = { userId: req.user.id };
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (subject) where.subject = subject;
    if (date) where.date = date;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const tasks = await Task.findAll({ 
      where,
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      where: { 
        id: req.params.id, 
        userId: req.user.id 
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    let task = await Task.findOne({ 
      where: { 
        id: req.params.id, 
        userId: req.user.id 
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.update(req.body);

    if (req.body.status === 'completed' && !task.completedAt) {
      await task.update({ completedAt: new Date() });
    }

    const updated = await Task.findByPk(task.id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      where: { 
        id: req.params.id, 
        userId: req.user.id 
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Task.destroy({ where: { id: req.params.id } });
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      where: { 
        id: req.params.id, 
        userId: req.user.id 
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const session = await StudySession.create({
      userId: req.user.id,
      taskId: task.id,
      title: task.title,
      subject: task.subject,
      duration: task.duration
    });

    await task.update({ status: 'in-progress' });

    res.json({ session, task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      where: { 
        id: req.params.id, 
        userId: req.user.id 
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.update({ 
      status: 'completed',
      completedAt: new Date()
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;