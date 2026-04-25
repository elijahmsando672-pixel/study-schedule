import { Router } from 'express';
import { db } from '../db';
import { sessions, subjects, scheduleSlots, reminders } from '../../../lib/db/src/schema';
import { eq, gte, lte, sql } from 'drizzle-orm';

const router = Router();

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

router.get('/summary', async (_req, res): Promise<void> => {
  const now = new Date();
  const today = isoDate(now);
  const weekStart = isoDate(startOfWeek(now));

  const [todayAgg] = await db
    .select({
      total: sql`COALESCE(SUM(${sessions.duration}), 0)`,
    })
    .from(sessions)
    .where(eq(sessions.date, today));

  const [weekAgg] = await db
    .select({
      total: sql`COALESCE(SUM(${sessions.duration}), 0)`,
      count: sql`COUNT(*)`,
    })
    .from(sessions)
    .where(gte(sessions.date, weekStart));

  const [goalAgg] = await db
    .select({
      total: sql`COALESCE(SUM(${subjects.targetHours}), 0)`,
      count: sql`COUNT(*)`,
    })
    .from(subjects);

  const recentRows = await db
    .selectDistinctOn([sessions.date], { date: sessions.date })
    .from(sessions)
    .orderBy({ column: sessions.date, order: 'desc' });

  const dateSet = new Set(recentRows.map((r) => r.date));
  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!dateSet.has(isoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dateSet.has(isoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const todayDow = now.getDay();
  const enabledRemindersToday = await db
    .select({ id: reminders.id })
    .from(reminders)
    .where(
      eq(reminders.isActive, true)
    );

  const payload = {
    minutesToday: todayAgg?.total ?? 0,
    minutesThisWeek: weekAgg?.total ?? 0,
    sessionsThisWeek: weekAgg?.count ?? 0,
    currentStreakDays: streak,
    weeklyGoalMinutes: (goalAgg?.total ?? 0) * 60,
    subjectCount: goalAgg?.count ?? 0,
    upcomingReminderCount: enabledRemindersToday.length,
  };

  res.json(payload);
});

router.get('/today', async (_req, res): Promise<void> => {
  const todayDow = new Date().getDay();
  const rows = await db
    .select({
      id: scheduleSlots.id,
      subjectId: scheduleSlots.subjectId,
      subjectName: subjects.name,
      subjectColor: subjects.color,
      dayOfWeek: scheduleSlots.dayOfWeek,
      startTime: scheduleSlots.startTime,
      endTime: scheduleSlots.endTime,
    })
    .from(scheduleSlots)
    .innerJoin(subjects, eq(scheduleSlots.subjectId, subjects.id))
    .where(eq(scheduleSlots.dayOfWeek, todayDow))
    .orderBy(scheduleSlots.startTime);

  res.json(rows);
});

router.get('/weekly', async (_req, res): Promise<void> => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(now.getDate() - 6);

  const rows = await db
    .select({
      date: sessions.date,
      total: sql`COALESCE(SUM(${sessions.duration}), 0`,
    })
    .from(sessions)
    .where(
      and(
        gte(sessions.date, isoDate(start)),
        lte(sessions.date, isoDate(now)),
      )
    )
    .groupBy(sessions.date);

  const byDate = new Map(rows.map((r) => [r.date, r.total]));
  const result: { date: string; dayLabel: string; minutes: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = isoDate(d);
    result.push({
      date: k,
      dayLabel: DAY_LABELS[d.getDay()] ?? '',
      minutes: byDate.get(k) ?? 0,
    });
  }
  res.json(result);
});

router.get('/by-subject', async (_req, res): Promise<void> => {
  const weekStart = isoDate(startOfWeek(new Date()));
  const allSubjects = await db.select().from(subjects);

  const totals = await db
    .select({
      subjectId: sessions.subjectId,
      total: sql`COALESCE(SUM(${sessions.duration}), 0`,
    })
    .from(sessions)
    .where(gte(sessions.date, weekStart))
    .groupBy(sessions.subjectId);

  const totalsBySubject = new Map(totals.map((t) => [t.subjectId, t.total]));
  const result = allSubjects.map((s) => {
    const minutes = totalsBySubject.get(s.id) ?? 0;
    const percent =
      s.targetHours > 0
        ? Math.min(100, Math.round((minutes / (s.targetHours * 60)) * 100))
        : 0;
    return {
      subjectId: s.id,
      subjectName: s.name,
      color: s.color,
      minutesThisWeek: minutes,
      goalMinutesPerWeek: s.targetHours * 60,
      percent,
    };
  });
  res.json(result);
});

export default router;