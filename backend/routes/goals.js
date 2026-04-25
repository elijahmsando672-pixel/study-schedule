const express = require('express');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const goals = await Goal.findAll({ 
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const goal = await Goal.create({
      ...req.body,
      userId: req.user.id
    });
    res.status(201).json(goal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    let goal = await Goal.findOne({ 
      where: { 
        id: req.params.id, 
        userId: req.user.id 
      }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    await goal.update(req.body);

    if (goal.currentHours >= goal.targetHours && goal.status === 'active') {
      await goal.update({ status: 'completed' });
    }

    const updated = await Goal.findByPk(goal.id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOne({ 
      where: { 
        id: req.params.id, 
        userId: req.user.id 
      }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    await Goal.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/progress', async (req, res) => {
  try {
    const { hours } = req.body;
    
    const goal = await Goal.findOne({ 
      where: { 
        id: req.params.id, 
        userId: req.user.id 
      }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const newHours = goal.currentHours + hours;
    await goal.update({ 
      currentHours: newHours,
      status: newHours >= goal.targetHours ? 'completed' : 'active'
    });

    res.json(goal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;