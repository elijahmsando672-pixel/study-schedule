import * as SQLite from 'expo-sqlite';
import { Subject, Task, StudySession, Goal, ScheduleSlot, Reminder } from '../types';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync('studymaster.db');

      // Enable foreign keys
      await this.db.execAsync('PRAGMA foreign_keys = ON;');

      // Create tables
      await this.createTables();

      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    const queries = [
      // Subjects table
      `CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366F1',
        target_hours INTEGER NOT NULL DEFAULT 10,
        study_guide TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT
      )`,

      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        subject_id INTEGER,
        duration INTEGER NOT NULL,
        priority TEXT CHECK(priority IN ('low', 'medium', 'high')) NOT NULL DEFAULT 'medium',
        status TEXT CHECK(status IN ('pending', 'in-progress', 'completed')) NOT NULL DEFAULT 'pending',
        date TEXT NOT NULL,
        time TEXT,
        notes TEXT,
        reminder TEXT,
        user_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT,
        completed_at TEXT,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
      )`,

      // Study sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )`,

      // Goals table
      `CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        subject_id INTEGER,
        target_hours INTEGER NOT NULL DEFAULT 10,
        current_hours INTEGER NOT NULL DEFAULT 0,
        status TEXT CHECK(status IN ('active', 'completed', 'paused')) NOT NULL DEFAULT 'active',
        deadline TEXT,
        user_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
      )`,

      // Schedule slots table
      `CREATE TABLE IF NOT EXISTS schedule_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        subject_id INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )`,

      // Reminders table
      `CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subject_id INTEGER,
        time TEXT NOT NULL,
        days_of_week TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
      )`,

      // Sync queue for offline changes
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        operation TEXT CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        synced INTEGER NOT NULL DEFAULT 0
      )`,

      // User table (for local auth)
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    ];

    for (const query of queries) {
      await this.db.execAsync(query);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date)',
      'CREATE INDEX IF NOT EXISTS idx_schedule_day ON schedule_slots(day_of_week)',
    ];

    for (const index of indexes) {
      await this.db.execAsync(index);
    }
  }

  // Generic CRUD helpers
  private async getAll<T>(table: string, where?: { column: string; value: any }[]): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];

    if (where && where.length > 0) {
      const conditions = where.map(w => `${w.column} = ?`).join(' AND ');
      query += ` WHERE ${conditions}`;
      params.push(...where.map(w => w.value));
    }

    const rows = await this.db.getAllAsync<T>(query, params);
    return rows;
  }

  private async getOne<T>(table: string, id: number): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  private async insert(table: string, data: Record<string, any>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const result = await this.db.runAsync(
      `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
      values
    );

    return result.lastInsertRowId as number;
  }

  private async update(table: string, id: number, data: Record<string, any>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];

    await this.db.runAsync(
      `UPDATE ${table} SET ${setClause} WHERE id = ?`,
      values
    );
  }

  private async delete(table: string, id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  // Subject methods
  async getSubjects(): Promise<Subject[]> {
    return this.getAll<Subject>('subjects');
  }

  async getSubjectById(id: number): Promise<Subject | null> {
    return this.getOne<Subject>('subjects', id);
  }

  async createSubject(data: Partial<Subject>): Promise<number> {
    return this.insert('subjects', {
      name: data.name,
      color: data.color || '#6366F1',
      target_hours: data.targetHours || 10,
      study_guide: data.studyGuide,
    });
  }

  async updateSubject(id: number, data: Partial<Subject>): Promise<void> {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.targetHours !== undefined) updateData.target_hours = data.targetHours;
    if (data.studyGuide !== undefined) updateData.study_guide = data.studyGuide;
    updateData.updated_at = new Date().toISOString();

    await this.update('subjects', id, updateData);
  }

  async deleteSubject(id: number): Promise<void> {
    await this.delete('subjects', id);
  }

  // Task methods
  async getTasks(where?: { column: string; value: any }[]): Promise<Task[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = `
      SELECT
        t.*,
        s.name as subject_name,
        s.color as subject_color
      FROM tasks t
      LEFT JOIN subjects s ON t.subject_id = s.id
    `;
    const params: any[] = [];

    if (where && where.length > 0) {
      const conditions = where.map(w => `t.${w.column} = ?`).join(' AND ');
      query += ` WHERE ${conditions}`;
      params.push(...where.map(w => w.value));
    }

    query += ' ORDER BY t.created_at DESC';

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map(this.mapTaskFromDb);
  }

  async getTaskById(id: number): Promise<Task | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getAllAsync<any>(`
      SELECT
        t.*,
        s.name as subject_name,
        s.color as subject_color
      FROM tasks t
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE t.id = ?
    `, [id]);

    return row[0] ? this.mapTaskFromDb(row[0]) : null;
  }

  async createTask(data: Partial<Task>): Promise<number> {
    const taskData: Record<string, any> = {
      title: data.title,
      description: data.description,
      subject_id: data.subjectId,
      duration: data.duration,
      priority: data.priority || 'medium',
      status: data.status || 'pending',
      date: data.date,
      time: data.time,
      notes: data.notes,
      reminder: data.reminder,
      user_id: data.userId,
    };

    const id = await this.insert('tasks', taskData);

    // Queue for sync if user is logged in
    await this.queueSync('tasks', id, 'INSERT', taskData);

    return id;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<void> {
    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.subjectId !== undefined) updateData.subject_id = data.subjectId;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.time !== undefined) updateData.time = data.time;
    if (data.notes !== undefined) updateData.notes = data.notes;
    updateData.updated_at = new Date().toISOString();

    if (data.status === 'completed' && !data.completedAt) {
      updateData.completed_at = new Date().toISOString();
    }

    await this.update('tasks', id, updateData);

    // Queue for sync
    await this.queueSync('tasks', id, 'UPDATE', updateData);
  }

  async deleteTask(id: number): Promise<void> {
    await this.delete('tasks', id);
    await this.queueSync('tasks', id, 'DELETE', { id });
  }

  async completeTask(id: number): Promise<void> {
    await this.updateTask(id, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  }

  // Session methods
  async getSessions(where?: { column: string; value: any }[]): Promise<StudySession[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = `
      SELECT
        ses.*,
        sub.name as subject_name,
        sub.color as subject_color
      FROM sessions ses
      LEFT JOIN subjects sub ON ses.subject_id = sub.id
    `;
    const params: any[] = [];

    if (where && where.length > 0) {
      const conditions = where.map(w => `ses.${w.column} = ?`).join(' AND ');
      query += ` WHERE ${conditions}`;
      params.push(...where.map(w => w.value));
    }

    query += ' ORDER BY ses.date DESC';

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map(this.mapSessionFromDb);
  }

  async createSession(data: Partial<StudySession>): Promise<number> {
    const id = await this.insert('sessions', {
      subject_id: data.subjectId,
      duration: data.duration,
      date: data.date,
      notes: data.notes,
    });

    await this.queueSync('sessions', id, 'INSERT', {
      subject_id: data.subjectId,
      duration: data.duration,
      date: data.date,
      notes: data.notes,
    });

    return id;
  }

  async deleteSession(id: number): Promise<void> {
    await this.delete('sessions', id);
    await this.queueSync('sessions', id, 'DELETE', { id });
  }

  // Goal methods
  async getGoals(): Promise<Goal[]> {
    return this.getAll<Goal>('goals');
  }

  async createGoal(data: Partial<Goal>): Promise<number> {
    const id = await this.insert('goals', {
      title: data.title,
      description: data.description,
      subject_id: data.subjectId,
      target_hours: data.targetHours || 10,
      current_hours: data.currentHours || 0,
      status: data.status || 'active',
      deadline: data.deadline,
      user_id: data.userId,
    });

    await this.queueSync('goals', id, 'INSERT', data as any);
    return id;
  }

  async updateGoal(id: number, data: Partial<Goal>): Promise<void> {
    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.subjectId !== undefined) updateData.subject_id = data.subjectId;
    if (data.targetHours !== undefined) updateData.target_hours = data.targetHours;
    if (data.currentHours !== undefined) updateData.current_hours = data.currentHours;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.deadline !== undefined) updateData.deadline = data.deadline;
    updateData.updated_at = new Date().toISOString();

    // Auto-complete if target reached
    if (updateData.current_hours >= updateData.target_hours && updateData.status === 'active') {
      updateData.status = 'completed';
    }

    await this.update('goals', id, updateData);
    await this.queueSync('goals', id, 'UPDATE', updateData);
  }

  // Schedule slot methods
  async getScheduleSlots(where?: { column: string; value: any }[]): Promise<ScheduleSlot[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = `
      SELECT
        sl.*,
        s.name as subject_name,
        s.color as subject_color
      FROM schedule_slots sl
      LEFT JOIN subjects s ON sl.subject_id = s.id
    `;
    const params: any[] = [];

    if (where && where.length > 0) {
      const conditions = where.map(w => `sl.${w.column} = ?`).join(' AND ');
      query += ` WHERE ${conditions}`;
      params.push(...where.map(w => w.value));
    }

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map(row => ({
      id: row.id,
      dayOfWeek: row.day_of_week as DayOfWeek,
      startTime: row.start_time,
      endTime: row.end_time,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectColor: row.subject_color,
      isActive: Boolean(row.is_active),
    }));
  }

  async createScheduleSlot(data: Partial<ScheduleSlot>): Promise<number> {
    const id = await this.insert('schedule_slots', {
      day_of_week: data.dayOfWeek,
      start_time: data.startTime,
      end_time: data.endTime,
      subject_id: data.subjectId,
      is_active: data.isActive ? 1 : 0,
    });

    await this.queueSync('schedule_slots', id, 'INSERT', data as any);
    return id;
  }

  async updateScheduleSlot(id: number, data: Partial<ScheduleSlot>): Promise<void> {
    const updateData: Record<string, any> = {};
    if (data.dayOfWeek !== undefined) updateData.day_of_week = data.dayOfWeek;
    if (data.startTime !== undefined) updateData.start_time = data.startTime;
    if (data.endTime !== undefined) updateData.end_time = data.endTime;
    if (data.subjectId !== undefined) updateData.subject_id = data.subjectId;
    if (data.isActive !== undefined) updateData.is_active = data.isActive ? 1 : 0;

    await this.update('schedule_slots', id, updateData);
    await this.queueSync('schedule_slots', id, 'UPDATE', updateData);
  }

  async deleteScheduleSlot(id: number): Promise<void> {
    await this.delete('schedule_slots', id);
    await this.queueSync('schedule_slots', id, 'DELETE', { id });
  }

  // Reminder methods
  async getReminders(): Promise<Reminder[]> {
    const reminders = await this.getAll<Reminder>('reminders');
    return reminders.map(r => ({
      ...r,
      daysOfWeek: JSON.parse(r.daysOfWeek || '[]'),
    }));
  }

  async createReminder(data: Partial<Reminder>): Promise<number> {
    const id = await this.insert('reminders', {
      title: data.title,
      subject_id: data.subjectId || null,
      time: data.time,
      days_of_week: JSON.stringify(data.daysOfWeek || []),
      is_active: data.isActive ? 1 : 0,
    });

    await this.queueSync('reminders', id, 'INSERT', data as any);
    return id;
  }

  async updateReminder(id: number, data: Partial<Reminder>): Promise<void> {
    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.subjectId !== undefined) updateData.subject_id = data.subjectId;
    if (data.time !== undefined) updateData.time = data.time;
    if (data.daysOfWeek !== undefined) updateData.days_of_week = JSON.stringify(data.daysOfWeek);
    if (data.isActive !== undefined) updateData.is_active = data.isActive ? 1 : 0;

    await this.update('reminders', id, updateData);
    await this.queueSync('reminders', id, 'UPDATE', updateData);
  }

  async deleteReminder(id: number): Promise<void> {
    await this.delete('reminders', id);
    await this.queueSync('reminders', id, 'DELETE', { id });
  }

  // Stats & Dashboard queries
  async getTodayStats(): Promise<{ totalMinutes: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const today = new Date().toISOString().split('T')[0];
    const result = await this.db.getAllFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(duration), 0) as total FROM sessions WHERE date = ?`,
      [today]
    );

    return { totalMinutes: result[0]?.total || 0 };
  }

  async getWeekStats(): Promise<{ totalMinutes: number; sessionCount: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart = weekStart.toISOString().split('T')[0];

    const [totalResult, countResult] = await Promise.all([
      this.db.getAllFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(duration), 0) as total FROM sessions WHERE date >= ?`,
        [weekStart]
      ),
      this.db.getAllFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sessions WHERE date >= ?`,
        [weekStart]
      ),
    ]);

    return {
      totalMinutes: totalResult[0]?.total || 0,
      sessionCount: countResult[0]?.count || 0,
    };
  }

  async getWeeklyBreakdown(): Promise<Array<{ date: string; dayLabel: string; minutes: number }>> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(now.getDate() - 6); // 7 days including today

    const rows = await this.db.getAllAsync<{ date: string; total: number }>(
      `SELECT date, COALESCE(SUM(duration), 0) as total FROM sessions WHERE date >= ? AND date <= ? GROUP BY date`,
      [start.toISOString().split('T')[0], now.toISOString().split('T')[0]]
    );

    const byDate = new Map(rows.map(r => [r.date, r.total]));
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: Array<{ date: string; dayLabel: string; minutes: number }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        dayLabel: DAY_LABELS[d.getDay()],
        minutes: byDate.get(dateStr) || 0,
      });
    }

    return result;
  }

  async getSubjectProgress(): Promise<Array<{
    subjectId: number;
    subjectName: string;
    color: string;
    minutesThisWeek: number;
    targetMinutes: number;
    percent: number;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart = weekStart.toISOString().split('T')[0];

    // Get all subjects with their sessions this week
    const result = await this.db.getAllAsync(`
      SELECT
        s.id as subjectId,
        s.name as subjectName,
        s.color,
        s.target_hours,
        COALESCE(SUM(ses.duration), 0) as minutesThisWeek
      FROM subjects s
      LEFT JOIN sessions ses ON s.id = ses.subject_id AND ses.date >= ?
      GROUP BY s.id
    `, [weekStart]);

    return result.map(row => ({
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      color: row.color,
      minutesThisWeek: row.minutesThisWeek,
      targetMinutes: row.target_hours * 60,
      percent: row.target_hours > 0
        ? Math.min(100, Math.round((row.minutesThisWeek / (row.target_hours * 60)) * 100))
        : 0,
    }));
  }

  async getTodaySchedule(): Promise<Array<{
    id: number;
    subjectId: number;
    subjectName: string;
    subjectColor: string;
    startTime: string;
    endTime: string;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    const todayDow = new Date().getDay();
    const result = await this.db.getAllAsync(`
      SELECT
        sl.id,
        sl.subject_id as subjectId,
        s.name as subjectName,
        s.color as subjectColor,
        sl.start_time as startTime,
        sl.end_time as endTime
      FROM schedule_slots sl
      JOIN subjects s ON sl.subject_id = s.id
      WHERE sl.day_of_week = ? AND sl.is_active = 1
      ORDER BY sl.start_time
    `, [todayDow]);

    return result;
  }

  // Sync queue methods
  private async queueSync(table: string, recordId: number, operation: 'INSERT' | 'UPDATE' | 'DELETE', data: Record<string, any>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO sync_queue (table_name, record_id, operation, data) VALUES (?, ?, ?, ?)`,
      [table, recordId, operation, JSON.stringify(data)]
    );
  }

  async getPendingSyncs(): Promise<Array<{ id: number; tableName: string; recordId: number; operation: string; data: string }>> {
    return this.getAll('sync_queue', [
      { column: 'synced', value: 0 }
    ]);
  }

  async markSyncComplete(syncId: number): Promise<void> {
    await this.update('sync_queue', syncId, { synced: 1 });
  }

  async clearSynced(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM sync_queue WHERE synced = 1');
  }

  // Helper: Map DB row to Task type
  private mapTaskFromDb(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectColor: row.subject_color,
      duration: row.duration,
      priority: row.priority as Priority,
      status: row.status as TaskStatus,
      date: row.date,
      time: row.time,
      notes: row.notes,
      reminder: row.reminder,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }

  // Helper: Map DB row to Session type
  private mapSessionFromDb(row: any): StudySession {
    return {
      id: row.id,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectColor: row.subject_color,
      duration: row.duration,
      date: row.date,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}

export const dbService = new DatabaseService();
