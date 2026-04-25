import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  Task,
  StudySession,
  Subject,
  Goal,
  ScheduleSlot,
  Reminder,
  DashboardSummary,
  WeeklyProgress,
  SubjectProgress,
  User
} from '../types';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Determine the correct API URL based on environment
    let apiUrl: string;

    if (__DEV__) {
      // In development, try to use LAN IP for physical devices
      // For simulator/emulator, localhost works
      // Priority: EXPO_PUBLIC_API_URL > localhost > 10.0.2.2 (Android emulator)
      apiUrl = process.env.EXPO_PUBLIC_API_URL ||
               'http://localhost:5000/api';

      // Auto-detect Android emulator
      if (!apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
        // Custom URL provided
      } else {
        // Check if we're likely on Android emulator
        // For simplicity, keep localhost - if on Android emulator, they need to set EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
      }
    } else {
      // Production
      apiUrl = 'https://api.studymaster.app/api';
    }

    this.baseURL = apiUrl;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - logout
          await this.clearToken();
          // Could navigate to login here
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  private async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('jwt_token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('jwt_token', token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  async clearToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('jwt_token');
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: { email: string; password: string; name: string }): Promise<{ token: string; user: User }> {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // Tasks
  async getTasks(params?: { status?: string; date?: string }): Promise<Task[]> {
    const response = await this.client.get('/tasks', { params });
    return response.data;
  }

  async getTask(id: number): Promise<Task> {
    const response = await this.client.get(`/tasks/${id}`);
    return response.data;
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const response = await this.client.post('/tasks', data);
    return response.data;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    const response = await this.client.put(`/tasks/${id}`, data);
    return response.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.client.delete(`/tasks/${id}`);
  }

  async completeTask(id: number): Promise<Task> {
    const response = await this.client.post(`/tasks/${id}/complete`);
    return response.data;
  }

  async startTask(id: number): Promise<Task> {
    const response = await this.client.post(`/tasks/${id}/start`);
    return response.data;
  }

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const response = await this.client.get('/subjects');
    return response.data;
  }

  async getSubject(id: number): Promise<Subject> {
    const response = await this.client.get(`/subjects/${id}`);
    return response.data;
  }

  async createSubject(data: Partial<Subject>): Promise<Subject> {
    const response = await this.client.post('/subjects', data);
    return response.data;
  }

  async updateSubject(id: number, data: Partial<Subject>): Promise<Subject> {
    const response = await this.client.put(`/subjects/${id}`, data);
    return response.data;
  }

  async deleteSubject(id: number): Promise<void> {
    await this.client.delete(`/subjects/${id}`);
  }

  // Study Sessions
  async getSessions(params?: { subjectId?: number; startDate?: string; endDate?: string }): Promise<StudySession[]> {
    const response = await this.client.get('/sessions', { params });
    return response.data;
  }

  async createSession(data: Partial<StudySession>): Promise<StudySession> {
    const response = await this.client.post('/sessions', data);
    return response.data;
  }

  async deleteSession(id: number): Promise<void> {
    await this.client.delete(`/sessions/${id}`);
  }

  // Goals
  async getGoals(): Promise<Goal[]> {
    const response = await this.client.get('/goals');
    return response.data;
  }

  async createGoal(data: Partial<Goal>): Promise<Goal> {
    const response = await this.client.post('/goals', data);
    return response.data;
  }

  async updateGoal(id: number, data: Partial<Goal>): Promise<Goal> {
    const response = await this.client.put(`/goals/${id}`, data);
    return response.data;
  }

  async deleteGoal(id: number): Promise<void> {
    await this.client.delete(`/goals/${id}`);
  }

  async addGoalProgress(id: number, hours: number): Promise<Goal> {
    const response = await this.client.post(`/goals/${id}/progress`, { hours });
    return response.data;
  }

  // Schedule
  async getScheduleSlots(): Promise<ScheduleSlot[]> {
    const response = await this.client.get('/schedule-slots');
    return response.data;
  }

  async createScheduleSlot(data: Partial<ScheduleSlot>): Promise<ScheduleSlot> {
    const response = await this.client.post('/schedule-slots', data);
    return response.data;
  }

  async updateScheduleSlot(id: number, data: Partial<ScheduleSlot>): Promise<ScheduleSlot> {
    const response = await this.client.put(`/schedule-slots/${id}`, data);
    return response.data;
  }

  async deleteScheduleSlot(id: number): Promise<void> {
    await this.client.delete(`/schedule-slots/${id}`);
  }

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    const response = await this.client.get('/reminders');
    return response.data;
  }

  async createReminder(data: Partial<Reminder>): Promise<Reminder> {
    const response = await this.client.post('/reminders', {
      ...data,
      daysOfWeek: JSON.stringify(data.daysOfWeek),
    });
    return response.data;
  }

  async updateReminder(id: number, data: Partial<Reminder>): Promise<Reminder> {
    const response = await this.client.put(`/reminders/${id}`, {
      ...data,
      daysOfWeek: JSON.stringify(data.daysOfWeek),
    });
    return response.data;
  }

  async deleteReminder(id: number): Promise<void> {
    await this.client.delete(`/reminders/${id}`);
  }

  async toggleReminder(id: number, isActive: boolean): Promise<Reminder> {
    const response = await this.client.put(`/reminders/${id}`, { isActive });
    return response.data;
  }

  // Dashboard & Stats
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await this.client.get('/dashboard/summary');
    return response.data;
  }

  async getTodaySchedule(): Promise<Array<{ id: number; subjectId: number; subjectName: string; subjectColor: string; startTime: string; endTime: string }>> {
    const response = await this.client.get('/dashboard/today');
    return response.data;
  }

  async getWeeklyProgress(): Promise<WeeklyProgress[]> {
    const response = await this.client.get('/progress/weekly');
    return response.data;
  }

  async getSubjectProgress(): Promise<SubjectProgress[]> {
    const response = await this.client.get('/progress/by-subject');
    return response.data;
  }

  // Sync operations
  async syncPendingChanges(changes: Array<{
    table: string;
    recordId: number;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    data: Record<string, any>;
  }>): Promise<void> {
    // Batch sync endpoint (to be implemented on backend)
    try {
      await this.client.post('/sync', { changes });
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();
