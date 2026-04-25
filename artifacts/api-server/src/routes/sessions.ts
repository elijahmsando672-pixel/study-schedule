import { Router } from 'express';
import { db } from '../../db';
import { sessions, subjects } from '../../../lib/db/src/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  const { subjectId, startDate, endDate } = req.query;
  let query = db.select({
    id: sessions.id,
    subjectId: sessions.subjectId,
    subjectName: subjects.name,
    subjectColor: subjects.color,
    duration: sessions.duration,
    date: sessions.date,
    notes: sessions.notes,
    createdAt: sessions.createdAt,
  }).from(sessions).leftJoin(subjects, eq(sessions.subjectId, subjects.id));

  const conditions = [];
  if (subjectId) conditions.push(eq(sessions.subjectId, parseInt(subjectId as string)));
  if (startDate) conditions.push(gte(sessions.date, startDate as string));
  if (endDate) conditions.push(lte(sessions.date, endDate as string)));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allSessions = await query.orderBy(sessions.date.desc());
  res.json(allSessions);
});

router.post('/', async (req, res) => {
  const { subjectId, duration, date, notes } = req.body;
  const [created] = await db.insert(sessions).values({ subjectId, duration, date, notes }).returning();
  res.status(201).json(created);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(sessions).where(eq(sessions.id, id));
  res.status(204).send();
});

export default router;