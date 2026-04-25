import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Task, Subject, StudySession, Goal, ScheduleSlot, Reminder, DashboardSummary, WeeklyProgress, SubjectProgress, User } from '../types';
import { dbService } from '../services/database';
import { api } from '../services/api';

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Data state
  tasks: Task[];
  subjects: Subject[];
  sessions: StudySession[];
  goals: Goal[];
  scheduleSlots: ScheduleSlot[];
  reminders: Reminder[];

  // Dashboard stats
  dashboardSummary: DashboardSummary | null;
  weeklyProgress: WeeklyProgress[];
  subjectProgress: SubjectProgress[];
  todaySchedule: ScheduleSlot[];

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Task actions
  loadTasks: () => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<number>;
  updateTask: (id: number, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  completeTask: (id: number) => Promise<void>;

  // Subject actions
  loadSubjects: () => Promise<void>;
  addSubject: (subject: Partial<Subject>) => Promise<number>;
  updateSubject: (id: number, data: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: number) => Promise<void>;

  // Session actions
  loadSessions: (params?: { subjectId?: number; startDate?: string; endDate?: string }) => Promise<void>;
  addSession: (session: Partial<StudySession>) => Promise<number>;
  deleteSession: (id: number) => Promise<void>;

  // Goal actions
  loadGoals: () => Promise<void>;
  addGoal: (goal: Partial<Goal>) => Promise<number>;
  updateGoal: (id: number, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  addGoalProgress: (id: number, hours: number) => Promise<void>;

  // Schedule actions
  loadScheduleSlots: () => Promise<void>;
  addScheduleSlot: (slot: Partial<ScheduleSlot>) => Promise<number>;
  updateScheduleSlot: (id: number, data: Partial<ScheduleSlot>) => Promise<void>;
  deleteScheduleSlot: (id: number) => Promise<void>;

  // Reminder actions
  loadReminders: () => Promise<void>;
  addReminder: (reminder: Partial<Reminder>) => Promise<number>;
  updateReminder: (id: number, data: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: number) => Promise<void>;
  toggleReminder: (id: number, isActive: boolean) => Promise<void>;

  // Dashboard actions
  loadDashboardData: () => Promise<void>;
  refreshStats: () => Promise<void>;

  // Sync
  syncWithServer: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    tasks: [],
    subjects: [],
    sessions: [],
    goals: [],
    scheduleSlots: [],
    reminders: [],

    dashboardSummary: null,
    weeklyProgress: [],
    subjectProgress: [],
    todaySchedule: [],

    // Auth actions
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    // Task actions
    loadTasks: async () => {
      set({ isLoading: true });
      try {
        const tasks = await dbService.getTasks();
        set({ tasks, isLoading: false });
      } catch (error) {
        console.error('Error loading tasks:', error);
        set({ isLoading: false });
      }
    },

    addTask: async (taskData) => {
      try {
        const id = await dbService.createTask({
          ...taskData,
          status: 'pending',
          createdAt: new Date().toISOString(),
        } as any);

        // Refresh tasks
        const tasks = await dbService.getTasks();
        set({ tasks });

        // Queue for sync if online
        get().syncWithServer();

        return id;
      } catch (error) {
        console.error('Error adding task:', error);
        throw error;
      }
    },

    updateTask: async (id, data) => {
      await dbService.updateTask(id, data);
      const tasks = await dbService.getTasks();
      set({ tasks });
      get().syncWithServer();
    },

    deleteTask: async (id) => {
      await dbService.deleteTask(id);
      const tasks = await dbService.getTasks();
      set({ tasks });
      get().syncWithServer();
    },

    completeTask: async (id) => {
      await dbService.completeTask(id);
      const tasks = await dbService.getTasks();
      set({ tasks });
      get().syncWithServer();
    },

    // Subject actions
    loadSubjects: async () => {
      set({ isLoading: true });
      try {
        const subjects = await dbService.getSubjects();
        set({ subjects, isLoading: false });
      } catch (error) {
        console.error('Error loading subjects:', error);
        set({ isLoading: false });
      }
    },

    addSubject: async (subjectData) => {
      try {
        const id = await dbService.createSubject({
          ...subjectData,
          createdAt: new Date().toISOString(),
        } as any);

        const subjects = await dbService.getSubjects();
        set({ subjects });
        get().syncWithServer();

        return id;
      } catch (error) {
        console.error('Error adding subject:', error);
        throw error;
      }
    },

    updateSubject: async (id, data) => {
      await dbService.updateSubject(id, {
        ...data,
        updatedAt: new Date().toISOString(),
      } as any);

      const subjects = await dbService.getSubjects();
      set({ subjects });
      get().syncWithServer();
    },

    deleteSubject: async (id) => {
      await dbService.deleteSubject(id);
      const subjects = await dbService.getSubjects();
      set({ subjects });
      get().syncWithServer();
    },

    // Session actions
    loadSessions: async (params) => {
      set({ isLoading: true });
      try {
        const sessions = await dbService.getSessions(
          params ? [{ column: 'subject_id', value: params.subjectId }] : undefined
        );
        set({ sessions, isLoading: false });
      } catch (error) {
        console.error('Error loading sessions:', error);
        set({ isLoading: false });
      }
    },

    addSession: async (sessionData) => {
      try {
        const id = await dbService.createSession({
          ...sessionData,
          createdAt: new Date().toISOString(),
        } as any);

        const sessions = await dbService.getSessions();
        set({ sessions });
        get().syncWithServer();

        return id;
      } catch (error) {
        console.error('Error adding session:', error);
        throw error;
      }
    },

    deleteSession: async (id) => {
      await dbService.deleteSession(id);
      const sessions = await dbService.getSessions();
      set({ sessions });
      get().syncWithServer();
    },

    // Goal actions
    loadGoals: async () => {
      const goals = await dbService.getGoals();
      set({ goals });
    },

    addGoal: async (goalData) => {
      try {
        const id = await dbService.createGoal({
          ...goalData,
          currentHours: goalData.currentHours || 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        } as any);

        const goals = await dbService.getGoals();
        set({ goals });
        get().syncWithServer();

        return id;
      } catch (error) {
        console.error('Error adding goal:', error);
        throw error;
      }
    },

    updateGoal: async (id, data) => {
      await dbService.updateGoal(id, data as any);
      const goals = await dbService.getGoals();
      set({ goals });
      get().syncWithServer();
    },

    deleteGoal: async (id) => {
      await dbService.deleteGoal(id);
      const goals = await dbService.getGoals();
      set({ goals });
      get().syncWithServer();
    },

    addGoalProgress: async (id, hours) => {
      await dbService.updateGoal(id, { currentHours: hours });
      const goals = await dbService.getGoals();
      set({ goals });
      get().syncWithServer();
    },

    // Schedule actions
    loadScheduleSlots: async () => {
      const slots = await dbService.getScheduleSlots();
      set({ scheduleSlots: slots });
    },

    addScheduleSlot: async (slotData) => {
      try {
        const id = await dbService.createScheduleSlot({
          ...slotData,
          isActive: true,
        } as any);

        const slots = await dbService.getScheduleSlots();
        set({ scheduleSlots: slots });
        get().syncWithServer();

        return id;
      } catch (error) {
        console.error('Error adding schedule slot:', error);
        throw error;
      }
    },

    updateScheduleSlot: async (id, data) => {
      await dbService.updateScheduleSlot(id, data as any);
      const slots = await dbService.getScheduleSlots();
      set({ scheduleSlots: slots });
      get().syncWithServer();
    },

    deleteScheduleSlot: async (id) => {
      await dbService.deleteScheduleSlot(id);
      const slots = await dbService.getScheduleSlots();
      set({ scheduleSlots: slots });
      get().syncWithServer();
    },

    // Reminder actions
    loadReminders: async () => {
      const reminders = await dbService.getReminders();
      set({ reminders });
    },

    addReminder: async (reminderData) => {
      try {
        const id = await dbService.createReminder({
          ...reminderData,
          isActive: true,
        } as any);

        const reminders = await dbService.getReminders();
        set({ reminders });
        get().syncWithServer();

        return id;
      } catch (error) {
        console.error('Error adding reminder:', error);
        throw error;
      }
    },

    updateReminder: async (id, data) => {
      await dbService.updateReminder(id, data as any);
      const reminders = await dbService.getReminders();
      set({ reminders });
      get().syncWithServer();
    },

    deleteReminder: async (id) => {
      await dbService.deleteReminder(id);
      const reminders = await dbService.getReminders();
      set({ reminders });
      get().syncWithServer();
    },

    toggleReminder: async (id, isActive) => {
      await dbService.updateReminder(id, { isActive });
      const reminders = await dbService.getReminders();
      set({ reminders });
      get().syncWithServer();
    },

    // Dashboard actions
    loadDashboardData: async () => {
      try {
        const [summary, weeklyBreakdown, subjectProg, todaySchedule] = await Promise.all([
          dbService.getTodayStats(),
          dbService.getWeeklyBreakdown(),
          dbService.getSubjectProgress(),
          dbService.getTodaySchedule(),
        ]);

        set({
          dashboardSummary: {
            minutesToday: summary.totalMinutes,
            minutesThisWeek: weeklyBreakdown.reduce((acc, d) => acc + d.minutes, 0),
            sessionsThisWeek: 0, // Could count from sessions table
            currentStreakDays: 0, // TODO: calculate streak
            weeklyGoalMinutes: 600,
            subjectCount: get().subjects.length,
            upcomingReminderCount: get().reminders.filter(r => r.isActive).length,
          } as DashboardSummary,
          weeklyProgress: weeklyBreakdown,
          subjectProgress: subjectProg as SubjectProgress[],
          todaySchedule,
        });
      } catch (error) {
        console.error('Error loading dashboard:', error);
      }
    },

    refreshStats: async () => {
      const { loadTasks, loadSubjects, loadGoals, loadSessions, loadDashboardData } = get();
      await Promise.all([
        loadTasks(),
        loadSubjects(),
        loadSessions(),
        loadGoals(),
        loadDashboardData(),
      ]);
    },

    // Sync with server
    syncWithServer: async () => {
      if (!(await api.isAuthenticated())) return;

      try {
        const pendingSyncs = await dbService.getPendingSyncs();

        if (pendingSyncs.length > 0) {
          const changes = pendingSyncs.map(sync => ({
            table: sync.tableName,
            recordId: sync.recordId,
            operation: sync.operation,
            data: JSON.parse(sync.data),
          }));

          await api.syncPendingChanges(changes);

          // Mark as synced
          for (const sync of pendingSyncs) {
            await dbService.markSyncComplete(sync.id);
          }

          await dbService.clearSynced();
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    },

    clearError: () => set({ error: null }),

    reset: () => set({
      user: null,
      isAuthenticated: false,
      tasks: [],
      subjects: [],
      sessions: [],
      goals: [],
      scheduleSlots: [],
      reminders: [],
      dashboardSummary: null,
      weeklyProgress: [],
      subjectProgress: [],
      todaySchedule: [],
      error: null,
    }),
  }))
);
