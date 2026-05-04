import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Task, Subject, StudySession, Goal, ScheduleSlot, Reminder, DashboardSummary, WeeklyProgress, SubjectProgress, User, DayOfWeek } from '../types';
import { dbService } from '../services/database';
import { api } from '../services/api';

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
function debouncedSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    const { syncWithServer } = useStore.getState();
    syncWithServer();
  }, 2000);
}

const privateLoadingKeys = new Set<string>();

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
      if (privateLoadingKeys.has('tasks')) return;
      privateLoadingKeys.add('tasks');
      set({ isLoading: true });
      try {
        const isOnline = await api.isAuthenticated() && await api.ping();
        if (isOnline) {
          const serverTasks = await api.getTasks();
          set({ tasks: serverTasks, isLoading: false });
        } else {
          const tasks = await dbService.getTasks();
          set({ tasks, isLoading: false });
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
        const tasks = await dbService.getTasks();
        set({ tasks, isLoading: false });
      } finally {
        privateLoadingKeys.delete('tasks');
      }
    },

    addTask: async (taskData) => {
      try {
        const id = await dbService.createTask({
          ...taskData,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        const tasks = await dbService.getTasks();
        set({ tasks });

        debouncedSync();

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
      debouncedSync();
    },

    deleteTask: async (id) => {
      await dbService.deleteTask(id);
      const tasks = await dbService.getTasks();
      set({ tasks });
      debouncedSync();
    },

    completeTask: async (id) => {
      const isOnline = await api.isAuthenticated() && await api.ping();
      if (isOnline) {
        try {
          const completedTask = await api.completeTask(id);
          const tasks = await dbService.getTasks();
          set({ tasks });
          return;
        } catch (error) {
          console.error('API complete failed, falling back to local:', error);
        }
      }
      await dbService.completeTask(id);
      const tasks = await dbService.getTasks();
      set({ tasks });
      debouncedSync();
    },

    // Subject actions
    loadSubjects: async () => {
      if (privateLoadingKeys.has('subjects')) return;
      privateLoadingKeys.add('subjects');
      set({ isLoading: true });
      try {
        const isOnline = await api.isAuthenticated() && await api.ping();
        if (isOnline) {
          const serverSubjects = await api.getSubjects();
          set({ subjects: serverSubjects, isLoading: false });
        } else {
          const subjects = await dbService.getSubjects();
          set({ subjects, isLoading: false });
        }
      } catch (error) {
        console.error('Error loading subjects:', error);
        const subjects = await dbService.getSubjects();
        set({ subjects, isLoading: false });
      } finally {
        privateLoadingKeys.delete('subjects');
      }
    },

    addSubject: async (subjectData) => {
      try {
        const id = await dbService.createSubject({
          ...subjectData,
          createdAt: new Date().toISOString(),
        });

        const subjects = await dbService.getSubjects();
        set({ subjects });
        debouncedSync();

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
      });

      const subjects = await dbService.getSubjects();
      set({ subjects });
      debouncedSync();
    },

    deleteSubject: async (id) => {
      await dbService.deleteSubject(id);
      const subjects = await dbService.getSubjects();
      set({ subjects });
      debouncedSync();
    },

    // Session actions
    loadSessions: async (params) => {
      if (privateLoadingKeys.has('sessions')) return;
      privateLoadingKeys.add('sessions');
      set({ isLoading: true });
      try {
        const isOnline = await api.isAuthenticated() && await api.ping();
        if (isOnline) {
          const serverSessions = await api.getSessions(params);
          set({ sessions: serverSessions, isLoading: false });
        } else {
          const sessions = await dbService.getSessions(
            params ? [{ column: 'subject_id', value: params.subjectId }] : undefined
          );
          set({ sessions, isLoading: false });
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
        const sessions = await dbService.getSessions(
          params ? [{ column: 'subject_id', value: params.subjectId }] : undefined
        );
        set({ sessions, isLoading: false });
      } finally {
        privateLoadingKeys.delete('sessions');
      }
    },

    addSession: async (sessionData) => {
      try {
        const id = await dbService.createSession({
          ...sessionData,
          createdAt: new Date().toISOString(),
        });

        const sessions = await dbService.getSessions();
        set({ sessions });
        debouncedSync();

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
      debouncedSync();
    },

    // Goal actions
    loadGoals: async () => {
      if (privateLoadingKeys.has('goals')) return;
      privateLoadingKeys.add('goals');
      set({ isLoading: true });
      try {
        const isOnline = await api.isAuthenticated() && await api.ping();
        if (isOnline) {
          const serverGoals = await api.getGoals();
          set({ goals: serverGoals, isLoading: false });
        } else {
          const goals = await dbService.getGoals();
          set({ goals, isLoading: false });
        }
      } catch (error) {
        console.error('Error loading goals:', error);
        const goals = await dbService.getGoals();
        set({ goals, isLoading: false });
      } finally {
        privateLoadingKeys.delete('goals');
      }
    },

    addGoal: async (goalData) => {
      try {
        const id = await dbService.createGoal({
          ...goalData,
          currentHours: goalData.currentHours || 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        });

        const goals = await dbService.getGoals();
        set({ goals });
        debouncedSync();

        return id;
      } catch (error) {
        console.error('Error adding goal:', error);
        throw error;
      }
    },

    updateGoal: async (id, data) => {
      await dbService.updateGoal(id, data);
      const goals = await dbService.getGoals();
      set({ goals });
      debouncedSync();
    },

    deleteGoal: async (id) => {
      await dbService.deleteGoal(id);
      const goals = await dbService.getGoals();
      set({ goals });
      debouncedSync();
    },

    addGoalProgress: async (id, hours) => {
      await dbService.updateGoal(id, { currentHours: hours });
      const goals = await dbService.getGoals();
      set({ goals });
      debouncedSync();
    },

    // Schedule actions
    loadScheduleSlots: async () => {
      if (privateLoadingKeys.has('scheduleSlots')) return;
      privateLoadingKeys.add('scheduleSlots');
      set({ isLoading: true });
      try {
        const isOnline = await api.isAuthenticated() && await api.ping();
        if (isOnline) {
          const serverSlots = await api.getScheduleSlots();
          set({ scheduleSlots: serverSlots, isLoading: false });
        } else {
          const slots = await dbService.getScheduleSlots();
          set({ scheduleSlots: slots, isLoading: false });
        }
      } catch (error) {
        console.error('Error loading schedule slots:', error);
        const slots = await dbService.getScheduleSlots();
        set({ scheduleSlots: slots, isLoading: false });
      } finally {
        privateLoadingKeys.delete('scheduleSlots');
      }
    },

    addScheduleSlot: async (slotData) => {
      try {
        const id = await dbService.createScheduleSlot({
          ...slotData,
          isActive: true,
        });

        const slots = await dbService.getScheduleSlots();
        set({ scheduleSlots: slots });
        debouncedSync();

        return id;
      } catch (error) {
        console.error('Error adding schedule slot:', error);
        throw error;
      }
    },

    updateScheduleSlot: async (id, data) => {
      await dbService.updateScheduleSlot(id, data);
      const slots = await dbService.getScheduleSlots();
      set({ scheduleSlots: slots });
      debouncedSync();
    },

    deleteScheduleSlot: async (id) => {
      await dbService.deleteScheduleSlot(id);
      const slots = await dbService.getScheduleSlots();
      set({ scheduleSlots: slots });
      debouncedSync();
    },

    // Reminder actions
    loadReminders: async () => {
      if (privateLoadingKeys.has('reminders')) return;
      privateLoadingKeys.add('reminders');
      set({ isLoading: true });
      try {
        const isOnline = await api.isAuthenticated() && await api.ping();
        if (isOnline) {
          const serverReminders = await api.getReminders();
          set({ reminders: serverReminders, isLoading: false });
        } else {
          const reminders = await dbService.getReminders();
          set({ reminders, isLoading: false });
        }
      } catch (error) {
        console.error('Error loading reminders:', error);
        const reminders = await dbService.getReminders();
        set({ reminders, isLoading: false });
      } finally {
        privateLoadingKeys.delete('reminders');
      }
    },

    addReminder: async (reminderData) => {
      try {
        const id = await dbService.createReminder({
          ...reminderData,
          isActive: true,
        });

        const reminders = await dbService.getReminders();
        set({ reminders });
        debouncedSync();

        return id;
      } catch (error) {
        console.error('Error adding reminder:', error);
        throw error;
      }
    },

    updateReminder: async (id, data) => {
      await dbService.updateReminder(id, data);
      const reminders = await dbService.getReminders();
      set({ reminders });
      debouncedSync();
    },

    deleteReminder: async (id) => {
      await dbService.deleteReminder(id);
      const reminders = await dbService.getReminders();
      set({ reminders });
      debouncedSync();
    },

    toggleReminder: async (id, isActive) => {
      await dbService.updateReminder(id, { isActive });
      const reminders = await dbService.getReminders();
      set({ reminders });
      debouncedSync();
    },

    // Dashboard actions
    loadDashboardData: async () => {
      set({ isLoading: true });
      try {
        const isOnline = await api.isAuthenticated() && await api.ping();

        if (isOnline) {
          const [summary, weeklyBreakdown, subjectProg, todaySchedule] = await Promise.all([
            api.getDashboardSummary(),
            api.getWeeklyProgress(),
            api.getSubjectProgress(),
            api.getTodaySchedule(),
          ]);

          const slots: ScheduleSlot[] = todaySchedule.map((s: any) => ({
            id: s.id,
            subjectId: s.subjectId,
            subjectName: s.subjectName,
            subjectColor: s.subjectColor,
            startTime: s.startTime,
            endTime: s.endTime,
            dayOfWeek: new Date().getDay() as DayOfWeek,
            isActive: true,
          }));

          set({
            dashboardSummary: summary,
            weeklyProgress: weeklyBreakdown,
            subjectProgress: subjectProg,
            todaySchedule: slots,
            isLoading: false,
          });
        } else {
          const [summary, weeklyBreakdown, subjectProg, todaySchedule] = await Promise.all([
            dbService.getTodayStats(),
            dbService.getWeeklyBreakdown(),
            dbService.getSubjectProgress(),
            dbService.getTodaySchedule(),
          ]);

          const sessionsThisWeek = await dbService.getSessions();
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const weekSessions = sessionsThisWeek.filter((s: StudySession) => new Date(s.date) >= oneWeekAgo);

          set({
            dashboardSummary: {
              minutesToday: summary.totalMinutes,
              minutesThisWeek: weeklyBreakdown.reduce((acc, d) => acc + d.minutes, 0),
              sessionsThisWeek: weekSessions.length,
              currentStreakDays: 0,
              weeklyGoalMinutes: 600,
              subjectCount: get().subjects.length,
              upcomingReminderCount: get().reminders.filter(r => r.isActive).length,
            } as DashboardSummary,
            weeklyProgress: weeklyBreakdown,
            subjectProgress: subjectProg as unknown as SubjectProgress[],
            todaySchedule: todaySchedule as unknown as ScheduleSlot[],
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
        set({ isLoading: false });
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
            operation: sync.operation as 'INSERT' | 'UPDATE' | 'DELETE',
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
