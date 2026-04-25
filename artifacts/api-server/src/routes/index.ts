import { Router } from 'express';
import subjectsRouter from './subjects';
import scheduleSlotsRouter from './scheduleSlots';
import sessionsRouter from './sessions';
import remindersRouter from './reminders';
import dashboardRouter from './dashboard';

const router = Router();

router.use('/dashboard/summary', dashboardRouter);
router.use('/dashboard/today', dashboardRouter);
router.use('/progress/weekly', dashboardRouter);
router.use('/progress/by-subject', dashboardRouter);
router.use('/subjects', subjectsRouter);
router.use('/schedule-slots', scheduleSlotsRouter);
router.use('/sessions', sessionsRouter);
router.use('/reminders', remindersRouter);

export default router;