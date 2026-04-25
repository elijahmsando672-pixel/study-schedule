import { Router } from 'express';
import { db } from '../../db';
import { subjects } from '../../../lib/db/src/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  const allSubjects = await db.select().from(subjects);
  res.json(allSubjects);
});

router.post('/', async (req, res) => {
  const { name, color, targetHours } = req.body;
  const [created] = await db.insert(subjects).values({ name, color, targetHours: targetHours || 10 }).returning();
  res.status(201).json(created);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, color, targetHours, studyGuide } = req.body;
  const [updated] = await db.update(subjects).set({ name, color, targetHours, studyGuide }).where(eq(subjects.id, id)).returning();
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(subjects).where(eq(subjects.id, id));
  res.status(204).send();
});

export default router;