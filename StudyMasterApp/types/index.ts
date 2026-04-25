// Shared type definitions for the Study Master App
// These types should match the backend API models

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Subject {
  id: number;
  name: string;
  color: string;
  targetHours: number;
  studyGuide?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  id?: number;
  title: string;
  description?: string;
  subjectId?: number;
  subjectName?: string;
  subjectColor?: string;
  duration: number;
  priority: Priority;
  status: TaskStatus;
  date: string;
  time?: string;
  notes?: string;
  reminder?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
}

export interface StudySession {
  id?: number;
  subjectId: number;
  subjectName?: string;
  subjectColor?: string;
  duration: number;
  date: string;
  notes?: string;
  createdAt?: string;
}

export interface Goal {
  id?: number;
  title: string;
  description?: string;
  subjectId?: number;
  targetHours: number;
  currentHours: number;
  status: 'active' | 'completed' | 'paused';
  deadline?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleSlot {
  id?: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName?: string;
  subjectColor?: string;
  isActive: boolean;
}

export interface Reminder {
  id?: number;
  title: string;
  subjectId?: number | null;
  time: string;
  daysOfWeek: number[];
  isActive: boolean;
}

export interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
}

export interface DashboardSummary {
  minutesToday: number;
  minutesThisWeek: number;
  sessionsThisWeek: number;
  currentStreakDays: number;
  weeklyGoalMinutes: number;
  subjectCount: number;
  upcomingReminderCount: number;
}

export interface WeeklyProgress {
  date: string;
  dayLabel: string;
  minutes: number;
}

export interface SubjectProgress {
  subjectId: number;
  subjectName: string;
  color: string;
  minutesThisWeek: number;
  goalMinutesPerWeek: number;
  percent: number;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
