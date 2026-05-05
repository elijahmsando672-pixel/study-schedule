import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from 'axios';
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

// Define custom error types for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthError extends ApiError {
  constructor(message: string) {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string) {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

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
      timeout: 15000, // Increased timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token and metadata
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request timestamp for logging
        config.metadata = {
          startTime: Date.now(),
        };
        
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // Response interceptor for error handling and logging
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful requests in development
        if (__DEV__ && response.config.metadata) {
          const duration = Date.now() - response.config.metadata.startTime;
          console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
        }
        return response;
      },
      async (error: AxiosError) => {
        // Log error in development
        if (__DEV__) {
          console.error('[API Error]', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message,
          });
        }

        // Handle specific error cases
        if (error.code === 'ECONNABORTED') {
          return Promise.reject(new NetworkError('Request timeout'));
        }

        if (!error.response) {
          return Promise.reject(new NetworkError('Network error - please check your connection'));
        }

        const { status, data } = error.response;
        
        // Handle authentication errors
        if (status === 401) {
          await this.clearToken();
          // Could navigate to login here
          return Promise.reject(new AuthError('Authentication failed - please log in again'));
        }

        // Handle rate limiting
        if (status === 429) {
          return Promise.reject(new ApiError('Rate limit exceeded. Please try again later.', status, 'RATE_LIMIT_ERROR'));
        }

        // Handle validation errors
        if (status === 400) {
          const errorMessage = data?.message || 'Validation error';
          return Promise.reject(new ApiError(errorMessage, status, 'VALIDATION_ERROR'));
        }

        // Handle server errors
        if (status >= 500) {
          return Promise.reject(new ApiError('Server error. Please try again later.', status, 'SERVER_ERROR'));
        }

        // Default error handling
        const errorMessage = data?.message || error.message || 'An unknown error occurred';
        return Promise.reject(new ApiError(errorMessage, status));
      }
    );
  }

  // Helper method for making requests with retry logic
  private async requestWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on auth errors or validation errors
        if (error instanceof AuthError || 
            error.name === 'VALIDATION_ERROR' ||
            (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && 
             error.statusCode !== 429)) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = this.baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
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
     return this.requestWithRetry(() => 
       this.client.get('/tasks', { params }).then(res => res.data)
     );
   }

   async getTask(id: number): Promise<Task> {
     return this.requestWithRetry(() => 
       this.client.get(`/tasks/${id}`).then(res => res.data)
     );
   }

   async createTask(data: Partial<Task>): Promise<Task> {
     return this.requestWithRetry(() => 
       this.client.post('/tasks', data).then(res => res.data)
     );
   }

   async updateTask(id: number, data: Partial<Task>): Promise<Task> {
     return this.requestWithRetry(() => 
       this.client.put(`/tasks/${id}`, data).then(res => res.data)
     );
   }

   async deleteTask(id: number): Promise<void> {
     return this.requestWithRetry(() => 
       this.client.delete(`/tasks/${id}`).then(res => res.data)
     );
   }

   async completeTask(id: number): Promise<Task> {
     return this.requestWithRetry(() => 
       this.client.post(`/tasks/${id}/complete`).then(res => res.data)
     );
   }

   async startTask(id: number): Promise<Task> {
     return this.requestWithRetry(() => 
       this.client.post(`/tasks/${id}/start`).then(res => res.data)
     );
   }

   // Subjects
   async getSubjects(): Promise<Subject[]> {
     return this.requestWithRetry(() => 
       this.client.get('/subjects').then(res => res.data)
     );
   }

   async getSubject(id: number): Promise<Subject> {
     return this.requestWithRetry(() => 
       this.client.get(`/subjects/${id}`).then(res => res.data)
     );
   }

   async createSubject(data: Partial<Subject>): Promise<Subject> {
     return this.requestWithRetry(() => 
       this.client.post('/subjects', data).then(res => res.data)
     );
   }

   async updateSubject(id: number, data: Partial<Subject>): Promise<Subject> {
     return this.requestWithRetry(() => 
       this.client.put(`/subjects/${id}`, data).then(res => res.data)
     );
   }

   async deleteSubject(id: number): Promise<void> {
     return this.requestWithRetry(() => 
       this.client.delete(`/subjects/${id}`).then(res => res.data)
     );
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

  // Sync operations with conflict resolution
  async syncPendingChanges(changes: Array<{
    table: string;
    recordId: number;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    data: Record<string, any>;
  }>): Promise<void> {
    try {
      await this.client.post('/sync', { changes });
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  // Sync with conflict resolution support
  async syncWithConflictResolution(changes: Array<{
    table: string;
    recordId: number;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    data: Record<string, any>;
    clientUpdatedAt?: string;
  }>): Promise<{
    syncedIds: number[];
    conflicts: Array<{
      table: string;
      recordId: number;
      serverData: any;
      clientData: any;
    }>;
  }> {
    try {
      const response = await this.client.post('/sync/with-conflicts', {
        changes,
        clientTimestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error('Sync with conflict resolution failed:', error);
      throw error;
    }
  }

  // Request cancellation support
  private abortControllers = new Map<string, AbortController>();

  // Create a cancellable request
  private async cancellableRequest<T>(
    key: string,
    request: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    // Cancel any existing request with the same key
    if (this.abortControllers.has(key)) {
      this.abortControllers.get(key)?.abort();
    }

    const controller = new AbortController();
    this.abortControllers.set(key, controller);

    try {
      const result = await request(controller.signal);
      this.abortControllers.delete(key);
      return result;
    } catch (error: any) {
      this.abortControllers.delete(key);
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        throw new ApiError('Request cancelled', 0, 'REQUEST_CANCELLED');
      }
      throw error;
    }
  }

  // Wrapper methods with cancellation support for frequently updated data
  async getTasksCancellable(params?: { status?: string; date?: string }): Promise<Task[]> {
    return this.cancellableRequest('getTasks', (signal) =>
      this.client.get('/tasks', { params, signal }).then(res => res.data)
    );
  }

  async getSubjectsCancellable(): Promise<Subject[]> {
    return this.cancellableRequest('getSubjects', (signal) =>
      this.client.get('/subjects', { signal }).then(res => res.data)
    );
  }

  async getDashboardSummaryCancellable(): Promise<DashboardSummary> {
    return this.cancellableRequest('getDashboard', (signal) =>
      this.client.get('/dashboard/summary', { signal }).then(res => res.data)
    );
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
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
