const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');
const Subject = require('../models/Subject');
const { protect } = require('../middleware/auth');

router.use(protect);

/**
 * POST /api/sync/with-conflicts
 * Receives batch of changes with client timestamps, handles conflicts
 * Returns: { syncedIds: [], conflicts: [{ table, recordId, serverData, clientData }] }
 */
router.post('/with-conflicts', async (req, res) => {
  try {
    const { changes } = req.body;

    if (!Array.isArray(changes)) {
      return res.status(400).json({ message: 'Changes must be an array' });
    }

    const syncedIds = [];
    const conflicts = [];

    for (const change of changes) {
      const { table, recordId, operation, data, clientUpdatedAt } = change;

      try {
        let result;

        switch (table) {
          case 'tasks':
            result = await syncTaskWithConflict(recordId, operation, data, clientUpdatedAt);
            break;
          case 'sessions':
            result = await syncSessionWithConflict(recordId, operation, data, clientUpdatedAt);
            break;
          case 'goals':
            result = await syncGoalWithConflict(recordId, operation, data, clientUpdatedAt);
            break;
          case 'subjects':
            result = await syncSubjectWithConflict(recordId, operation, data, clientUpdatedAt);
            break;
          default:
            result = { success: false, error: `Unknown table: ${table}` };
        }

        if (result.success) {
          syncedIds.push(result.syncId || recordId);
          if (result.conflict) {
            conflicts.push(result.conflict);
  }
}

// eslint-disable-next-line no-unused-vars
function mapTaskData(data) {
  return {
    userId: data.userId,
    title: data.title,
    subject: data.subject || 'General',
    description: data.description || '',
    date: data.date,
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    duration: data.duration,
    priority: data.priority || 'medium',
    status: data.status || 'pending',
    notes: data.notes || '',
    reminder: data.reminder || null,
    isRecurring: data.isRecurring || false,
    recurrencePattern: data.recurrencePattern || null,
    recurrenceEndDate: data.recurrenceEndDate || null,
    recurrenceParentId: data.recurrenceParentId || null,
  };
}

// eslint-disable-next-line no-unused-vars
function mapSessionData(data) {
  return {
    userId: data.userId,
    taskId: data.taskId || null,
    title: data.title,
    subject: data.subject || 'General',
    duration: data.duration,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    completedAt: data.completedAt || null,
    notes: data.notes || '',
  };
}

// eslint-disable-next-line no-unused-vars
function mapGoalData(data) {
  return {
    userId: data.userId,
    title: data.title,
    description: data.description || '',
    targetHours: data.targetHours,
    currentHours: data.currentHours || 0,
    deadline: data.deadline || '',
    status: data.status || 'active',
  };
}

// eslint-disable-next-line no-unused-vars
function mapSubjectData(data) {
  return {
    userId: data.userId,
    name: data.name,
    color: data.color || '#6366F1',
    targetHours: data.targetHours || 10,
    studyGuide: data.studyGuide || '',
  };
}
      } catch (error) {
        console.warn(`Sync failed for ${table} ${recordId}:`, error.message);
      }
    }

    res.json({
      syncedIds,
      conflicts,
      message: `Synced ${syncedIds.length} changes, ${conflicts.length} conflicts resolved`,
    });
  } catch (error) {
    console.error('Sync with conflicts error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Conflict resolution: Last-Write-Wins based on timestamp
 * If clientUpdatedAt > server updatedAt, use client data (client-wins)
 * Otherwise, return conflict with server data (server-wins)
 */
async function syncTaskWithConflict(recordId, operation, data, clientUpdatedAt) {
  try {
    if (operation === 'INSERT') {
      const [task, created] = await Task.findOrCreate({
        where: { id: recordId },
        defaults: mapTaskData(data),
      });
      
      if (!created) {
        // Check for conflict
        const serverUpdatedAt = task.updatedAt ? new Date(task.updatedAt).getTime() : 0;
        const clientTime = clientUpdatedAt ? new Date(clientUpdatedAt).getTime() : 0;
        
        if (clientTime > serverUpdatedAt) {
          // Client wins - update with client data
          await task.update(mapTaskData(data));
        } else {
          // Server wins - return conflict
          return {
            success: true,
            syncId: task.id,
            conflict: {
              table: 'tasks',
              recordId: task.id,
              serverData: task.toJSON(),
              clientData: data,
            },
          };
        }
      }
      return { success: true, syncId: task.id };
    }

    if (operation === 'UPDATE') {
      const task = await Task.findByPk(recordId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      const serverUpdatedAt = task.updatedAt ? new Date(task.updatedAt).getTime() : 0;
      const clientTime = clientUpdatedAt ? new Date(clientUpdatedAt).getTime() : 0;

      if (clientTime > serverUpdatedAt) {
        await task.update(mapTaskData(data));
      } else {
        return {
          success: true,
          syncId: task.id,
          conflict: {
            table: 'tasks',
            recordId: task.id,
            serverData: task.toJSON(),
            clientData: data,
          },
        };
      }
      return { success: true, syncId: task.id };
    }

    if (operation === 'DELETE') {
      const deleted = await Task.destroy({ where: { id: recordId } });
      return { success: deleted > 0, syncId: recordId };
    }

    return { success: false, error: `Unknown operation: ${operation}` };
  } catch (error) {
    console.warn('Task sync with conflict error:', error);
    return { success: false, error: error.message };
  }
}

async function syncSessionWithConflict(recordId, operation, data, clientUpdatedAt) {
  try {
    if (operation === 'INSERT') {
      const [session] = await StudySession.findOrCreate({
        where: { id: recordId },
        defaults: mapSessionData(data),
      });
      return { success: true, syncId: session.id };
    }

    if (operation === 'UPDATE') {
      const session = await StudySession.findByPk(recordId);
      if (!session) return { success: false, error: 'Session not found' };
      await session.update(mapSessionData(data));
      return { success: true, syncId: session.id };
    }

    if (operation === 'DELETE') {
      const deleted = await StudySession.destroy({ where: { id: recordId } });
      return { success: deleted > 0, syncId: recordId };
    }

    return { success: false, error: `Unknown operation: ${operation}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function syncGoalWithConflict(recordId, operation, data, clientUpdatedAt) {
  try {
    if (operation === 'INSERT') {
      const [goal] = await Goal.findOrCreate({
        where: { id: recordId },
        defaults: mapGoalData(data),
      });
      return { success: true, syncId: goal.id };
    }

    if (operation === 'UPDATE') {
      const goal = await Goal.findByPk(recordId);
      if (!goal) return { success: false, error: 'Goal not found' };
      await goal.update(mapGoalData(data));
      return { success: true, syncId: goal.id };
    }

    if (operation === 'DELETE') {
      const deleted = await Goal.destroy({ where: { id: recordId } });
      return { success: deleted > 0, syncId: recordId };
    }

    return { success: false, error: `Unknown operation: ${operation}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function syncSubjectWithConflict(recordId, operation, data, clientUpdatedAt) {
  try {
    if (operation === 'INSERT') {
      const [subject] = await Subject.findOrCreate({
        where: { id: recordId },
        defaults: mapSubjectData(data),
      });
      return { success: true, syncId: subject.id };
    }

    if (operation === 'UPDATE') {
      const subject = await Subject.findByPk(recordId);
      if (!subject) return { success: false, error: 'Subject not found' };
      await subject.update(mapSubjectData(data));
      return { success: true, syncId: subject.id };
    }

    if (operation === 'DELETE') {
      const deleted = await Subject.destroy({ where: { id: recordId } });
      return { success: deleted > 0, syncId: recordId };
    }

    return { success: false, error: `Unknown operation: ${operation}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = router;
