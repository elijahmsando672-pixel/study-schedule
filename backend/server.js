require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const statsRoutes = require('./routes/stats');
const goalRoutes = require('./routes/goals');
const syncRoutes = require('./routes/sync');
const dashboardRoutes = require('./routes/dashboard');
const progressRoutes = require('./routes/progress');
const scheduleSlotRoutes = require('./routes/scheduleSlots');
const reminderRoutes = require('./routes/reminders');
const subjectRoutes = require('./routes/subjects');
const sessionRoutes = require('./routes/sessions');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/schedule-slots', scheduleSlotRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Study Schedule API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.warn(`Server running on port ${PORT}`);
  });
};

startServer();

module.exports = app;
