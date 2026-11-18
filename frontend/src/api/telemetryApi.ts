/**
 * LifeLens Telemetry API Module (Financial, App Usage, Focus, Habits, Sleep, Workouts)
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type {
  FinancialTransaction,
  TransactionCreate,
  TransactionBatchCreate,
  TransactionSummary,
  AppUsageSession,
  AppUsageCreate,
  AppUsageBatchCreate,
  AppUsageSummary,
  FocusStudySession,
  FocusSessionCreate,
  FocusSessionSummary,
  Habit,
  HabitCreate,
  HabitUpdate,
  HabitLog,
  HabitLogCreate,
  HabitWithStreak,
  SleepInterval,
  SleepIntervalCreate,
  SleepIntervalBatchCreate,
  SleepSummaryResponse,
  WorkoutSession,
  WorkoutSessionCreate,
  WorkoutConsistencyResponse,
} from '@/src/types/api.types';
import { queryCache } from '@/src/utils/queryCache';

export const telemetryApi = {
  // Financial Transactions
  transactions: {
    create: async (data: TransactionCreate): Promise<FinancialTransaction> => {
      const res = await apiPost<FinancialTransaction>('/api/telemetry/transactions', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    createBatch: async (data: TransactionBatchCreate): Promise<FinancialTransaction[]> => {
      const res = await apiPost<FinancialTransaction[]>('/api/telemetry/transactions/batch', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    list: async (
      startDate?: string,
      endDate?: string,
      category?: string,
      isDiscretionary?: boolean,
      page = 1,
      pageSize = 30
    ): Promise<FinancialTransaction[]> => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (category) params.set('category', category);
      if (isDiscretionary !== undefined) params.set('is_discretionary', String(isDiscretionary));
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      return apiGet(`/api/telemetry/transactions?${params}`);
    },

    getSummary: async (startDate?: string, endDate?: string): Promise<TransactionSummary> => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const qs = params.toString() ? `?${params}` : '';
      return apiGet(`/api/telemetry/transactions/summary${qs}`);
    },

    delete: async (transactionId: string): Promise<void> => {
      await apiDelete(`/api/telemetry/transactions/${transactionId}`);
      queryCache.invalidate('dashboard');
    },
  },

  // App Usage Sessions
  appUsage: {
    create: async (data: AppUsageCreate): Promise<AppUsageSession> => {
      const res = await apiPost<AppUsageSession>('/api/telemetry/app-usage', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    createBatch: async (data: AppUsageBatchCreate): Promise<AppUsageSession[]> => {
      const res = await apiPost<AppUsageSession[]>('/api/telemetry/app-usage/batch', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    list: async (
      startDate?: string,
      endDate?: string,
      appCategory?: string,
      page = 1,
      pageSize = 50
    ): Promise<AppUsageSession[]> => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (appCategory) params.set('app_category', appCategory);
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      return apiGet(`/api/telemetry/app-usage?${params}`);
    },

    getSummary: async (startDate?: string, endDate?: string): Promise<AppUsageSummary> => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const qs = params.toString() ? `?${params}` : '';
      return apiGet(`/api/telemetry/app-usage/summary${qs}`);
    },
  },

  // Focus & Study Sessions
  focusSessions: {
    create: async (data: FocusSessionCreate): Promise<FocusStudySession> => {
      const res = await apiPost<FocusStudySession>('/api/telemetry/focus-sessions', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    list: async (
      startDate?: string,
      endDate?: string,
      subject?: string,
      page = 1,
      pageSize = 30
    ): Promise<FocusStudySession[]> => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (subject) params.set('subject', subject);
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      return apiGet(`/api/telemetry/focus-sessions?${params}`);
    },

    getSummary: async (startDate?: string, endDate?: string): Promise<FocusSessionSummary> => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const qs = params.toString() ? `?${params}` : '';
      return apiGet(`/api/telemetry/focus-sessions/summary${qs}`);
    },
  },

  // Habits & Streaks
  habits: {
    create: async (data: HabitCreate): Promise<Habit> => {
      const res = await apiPost<Habit>('/api/telemetry/habits', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    list: async (): Promise<HabitWithStreak[]> => {
      return apiGet('/api/telemetry/habits');
    },

    update: async (habitId: string, data: HabitUpdate): Promise<Habit> => {
      const res = await apiPut<Habit>(`/api/telemetry/habits/${habitId}`, data);
      queryCache.invalidate('dashboard');
      return res;
    },

    delete: async (habitId: string): Promise<void> => {
      await apiDelete(`/api/telemetry/habits/${habitId}`);
      queryCache.invalidate('dashboard');
    },

    logHabit: async (data: HabitLogCreate): Promise<HabitLog> => {
      const res = await apiPost<HabitLog>('/api/telemetry/habits/log', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    getLogs: async (
      habitId?: string,
      startDate?: string,
      endDate?: string
    ): Promise<HabitLog[]> => {
      const params = new URLSearchParams();
      if (habitId) params.set('habit_id', habitId);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const qs = params.toString() ? `?${params}` : '';
      return apiGet(`/api/telemetry/habits/logs${qs}`);
    },
  },

  // Sleep Intervals (Phase 1 / Standalone Native Collection)
  sleepIntervals: {
    create: async (data: SleepIntervalCreate): Promise<SleepInterval> => {
      const res = await apiPost<SleepInterval>('/api/telemetry/sleep-intervals', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    createBatch: async (data: SleepIntervalBatchCreate): Promise<SleepInterval[]> => {
      const res = await apiPost<SleepInterval[]>('/api/telemetry/sleep-intervals/batch', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    list: async (startDate?: string, endDate?: string, stage?: string): Promise<SleepInterval[]> => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (stage) params.set('stage', stage);
      const qs = params.toString() ? `?${params}` : '';
      return apiGet(`/api/telemetry/sleep-intervals${qs}`);
    },

    getSummary: async (date?: string): Promise<SleepSummaryResponse> => {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      const qs = params.toString() ? `?${params}` : '';
      return apiGet(`/api/telemetry/sleep-summary${qs}`);
    },
  },

  // Workout Sessions (Phase 1 / Standalone Native Collection)
  workouts: {
    create: async (data: WorkoutSessionCreate): Promise<WorkoutSession> => {
      const res = await apiPost<WorkoutSession>('/api/telemetry/workouts', data);
      queryCache.invalidate('dashboard');
      return res;
    },

    list: async (startDate?: string, endDate?: string, activityType?: string): Promise<WorkoutSession[]> => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (activityType) params.set('activity_type', activityType);
      const qs = params.toString() ? `?${params}` : '';
      return apiGet(`/api/telemetry/workouts${qs}`);
    },

    getConsistency: async (date?: string): Promise<WorkoutConsistencyResponse> => {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      const qs = params.toString() ? `?${params}` : '';
      return apiGet(`/api/telemetry/workouts/consistency${qs}`);
    },
  },
};
