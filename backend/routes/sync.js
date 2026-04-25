const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');
const Subject = require('../models/Subject');

// Protect all routes - require authentication
router.use(protect);

/**
 * POST /api/sync
 * Receives batch of changes from mobile app and applies them to PostgreSQL
 * Body: { changes: [{ table, recordId, operation, data }] }
 */
router.post('/', async (req, res) => {
  try {
    const { changes } = req.body;

    if (!Array.isArray(changes)) {
      return res.status(400).json({ message: 'Changes must be an array' });
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const change of changes) {
      const { table, recordId, operation, data } = change;

      try {
        let result;

        switch (table) {
          case 'tasks':
            result = await syncTask(recordId, operation, data);
            break;
          case 'sessions':
            result = await syncSession(recordId, operation, data);
            break;
          case 'goals':
            result = await syncGoal(recordId, operation, data);
            break;
          case 'subjects':
            result = await syncSubject(recordId, operation, data);
            break;
          default:
            result = {
              success: false,
              error: `Unknown table: ${table}`,
              id: recordId,
              table,
            };
        }

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          console.warn(`Sync failed for ${table} ${recordId}: ${result.error}`);
        }

        results.push(result);
      } catch (error) {
        failureCount++;
        results.push({
          success: false,
          id: recordId,
          table,
          error: error.message,
        });
      }
    }

    res.json({
      message: `Synced ${successCount} changes`,
      total: changes.length,
      success: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Individual sync functions for each model
 */

async function syncTask(recordId, operation, data) {
  try {
    if (operation === 'INSERT') {
      const [task] = await Task.findOrCreate({
        where: { id: recordId },
        defaults: mapTaskData(data),
      });
      return { success: true, id: task.id };
    }

    if (operation === 'UPDATE') {
      const task = await Task.findByPk(recordId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      await task.update(mapTaskData(data));
      return { success: true, id: task.id };
    }

    if (operation === 'DELETE') {
      const deleted = await Task.destroy({ where: { id: recordId } });
      if (deleted === 0) {
        return { success: false, error: 'Task not found' };
      }
      return { success: true, id: recordId };
    }

    return { success: false, error: `Unknown operation: ${operation}` };
  } catch (error) {
    console.error('Task sync error:', error);
    return { success: false, error: error.message };
  }
}

async function syncSession(recordId, operation, data) {
  try {
    if (operation === 'INSERT') {
      const [session] = await StudySession.findOrCreate({
        where: { id: recordId },
        defaults: mapSessionData(data),
      });
      return { success: true, id: session.id };
    }

    if (operation === 'UPDATE') {
      const session = await StudySession.findByPk(recordId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }
      await session.update(mapSessionData(data));
      return { success: true, id: session.id };
    }

    if (operation === 'DELETE') {
      const deleted = await StudySession.destroy({ where: { id: recordId } });
      if (deleted === 0) {
        return { success: false, error: 'Session not found' };
      }
      return { success: true, id: recordId };
    }

    return { success: false, error: `Unknown operation: ${operation}` };
  } catch (error) {
    console.error('Session sync error:', error);
    return { success: false, error: error.message };
  }
}

async function syncGoal(recordId, operation, data) {
  try {
    if (operation === 'INSERT') {
      const [goal] = await Goal.findOrCreate({
        where: { id: recordId },
        defaults: mapGoalData(data),
      });
      return { success: true, id: goal.id };
    }

    if (operation === 'UPDATE') {
      const goal = await Goal.findByPk(recordId);
      if (!goal) {
        return { success: false, error: 'Goal not found' };
      }
      await goal.update(mapGoalData(data));
      return { success: true, id: goal.id };
    }

    if (operation === 'DELETE') {
      const deleted = await Goal.destroy({ where: { id: recordId } });
      if (deleted === 0) {
        return { success: false, error: 'Goal not found' };
      }
      return { success: true, id: recordId };
    }

    return { success: false, error: `Unknown operation: ${operation}` };
  } catch (error) {
    console.error('Goal sync error:', error);
    return { success: false, error: error.message };
  }
}

async function syncSubject(recordId, operation, data) {
  try {
    if (operation === 'INSERT') {
      const [subject] = await Subject.findOrCreate({
        where: { id: recordId },
        defaults: mapSubjectData(data),
      });
      return { success: true, id: subject.id };
    }

    if (operation === 'UPDATE') {
      const subject = await Subject.findByPk(recordId);
      if (!subject) {
        return { success: false, error: 'Subject not found' };
      }
      await subject.update(mapSubjectData(data));
      return { success: true, id: subject.id };
    }

    if (operation === 'DELETE') {
      const deleted = await Subject.destroy({ where: { id: recordId } });
      if (deleted === 0) {
        return { success: false, error: 'Subject not found' };
      }
      return { success: true, id: recordId };
    }

    return { success: false, error: `Unknown operation: ${operation}` };
  } catch (error) {
    console.error('Subject sync error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Map mobile data formats to server model attributes
 */

function mapTaskData(data) {
  return {
    title: data.title,
    description: data.description || '',
    subject: data.subjectName || 'General',  // Store subject name as string
    duration: data.duration,
    priority: data.priority || 'medium',
    status: data.status || 'pending',
    date: data.date,
    time: data.time || null,
    notes: data.notes || '',
    reminder: data.reminder ? new Date(data.reminder) : null,
    userId: data.userId || 1,
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: new Date(),
  };
}

function mapSessionData(data) {
  return {
    subjectId: data.subjectId,
    subjectName: data.subjectName || 'General',
    duration: data.duration,
    date: data.date,
    notes: data.notes || '',
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
  };
}

function mapGoalData(data) {
  return {
    title: data.title,
    description: data.description || '',
    subjectId: data.subjectId,
    targetHours: data.targetHours || 10,
    currentHours: data.currentHours || 0,
    status: data.status || 'active',
    deadline: data.deadline || null,
    userId: data.userId || 1,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: new Date(),
  };
}

function mapSubjectData(data) {
  return {
    name: data.name,
    color: data.color || '#6366F1',
    targetHours: data.targetHours || 10,
    studyGuide: data.studyGuide || '',
    userId: data.userId || 1,
  };
}

module.exports = router;
