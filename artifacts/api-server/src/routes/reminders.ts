import { Router } from 'express';
import { db } from '../../db';
import { reminders } from '../../../lib/db/src/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  const allReminders = await db.select().from(reminders);
  res.json(allReminders);
});

router.post('/', async (req, res) => {
  const { subjectId, time, daysOfWeek, isActive } = req.body;
  const [created] = await db.insert(reminders).values({ 
    subjectId, 
    time, 
    daysOfWeek: JSON.stringify(daysOfWeek), 
    isActive: isActive ?? true 
  }).returning();
  res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { subjectId, time, daysOfWeek, isActive } = req.body;
  const [updated] = await db.update(reminders).set({ 
    subjectId, 
    time, 
    daysOfWeek: JSON.stringify(daysOfWeek), 
    isActive 
  }).where(eq(reminders.id, id)).returning();
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(reminders).where(eq(reminders.id, id));
  res.status(204).send();
});

export default router;