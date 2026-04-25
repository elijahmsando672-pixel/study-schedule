import { Router } from 'express';
import { db } from '../../db';
import { scheduleSlots } from '../../../lib/db/src/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  const slots = await db.select().from(scheduleSlots);
  res.json(slots);
});

router.post('/', async (req, res) => {
  const { dayOfWeek, startTime, endTime, subjectId, isActive } = req.body;
  const [created] = await db.insert(scheduleSlots).values({ dayOfWeek, startTime, endTime, subjectId, isActive: isActive ?? true }).returning();
  res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { dayOfWeek, startTime, endTime, subjectId, isActive } = req.body;
  const [updated] = await db.update(scheduleSlots).set({ dayOfWeek, startTime, endTime, subjectId, isActive }).where(eq(scheduleSlots.id, id)).returning();
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(scheduleSlots).where(eq(scheduleSlots.id, id));
  res.status(204).send();
});

export default router;