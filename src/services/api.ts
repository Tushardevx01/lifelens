/* eslint-disable no-console */
/**
 * LifeLens API client
 *
 * Thin wrapper around fetch that:
 * - reads the base URL from EXPO_PUBLIC_API_URL (set in .env)
 * - stores & injects the JWT access token automatically
 * - falls back gracefully to mock data when the backend is unreachable
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CONFIG } from '@/config';
import { mockDashboardData } from '@/src/features/dashboard/dashboard.data';
import type {
  DashboardData,
  LifeScore,
  TrendDataPoint,
  ProductivityPrediction,
  InsightSummary,
  BehaviouralCluster,
  Correlation,
  AnomalyAlert,
} from '@/src/features/dashboard/dashboard.types';
import type {
  TokenResponse,
  User,
  DailyEntry,
  DailyEntryCreate,
  DailyEntryUpdate,
  CsvUploadResponse,
  DashboardResponse,
  PredictionResponse,
  InsightResponse,
  LifeScoreHistoryPoint,
  ClusterResponse,
  AnomalyResponse,
  CorrelationResponse,
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
  Experiment,
  ExperimentCreate,
  ExperimentUpdate,
  ExperimentCheckin,
  ExperimentCheckinCreate,
  ActiveExperimentProgress,
  ExperimentEvaluation,
  ExperimentCompleteRequest,
  ExperimentTemplate,
  ExperimentStatus,
} from '@/src/types/api.types';

// ── Token management ─────────────────────────────────────────────────────────

export const TOKEN_STORAGE_KEY = '@lifelens_access_token';

let _accessToken: string | null = null;

export async function setAccessToken(token: string | null): Promise<void> {
  _accessToken = token;
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[LifeLens] Failed to persist access token in storage:', err);
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ── Low-level helpers ────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 8000;
const BASE_URL = CONFIG.API_URL;

async function handleResponseError(method: string, path: string, res: Response): Promise<never> {
  let errorDetail = '';
  try {
    const errorJson = await res.json();
    if (typeof errorJson === 'object' && errorJson !== null) {
      if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail;
      } else if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail
          .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
          .join('; ');
      } else {
        errorDetail = JSON.stringify(errorJson);
      }
    }
  } catch {
    // response was not JSON
  }
  const message = errorDetail
    ? `${method} ${path} failed (${res.status}): ${errorDetail}`
    : `${method} ${path} failed: ${res.status} ${res.statusText}`;
  throw new Error(message);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
  return headers;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!res.ok) await handleResponseError('GET', path, res);
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown, formEncoded = false): Promise<T> {
  const headers: Record<string, string> = formEncoded
    ? { 'Content-Type': 'application/x-www-form-urlencoded' }
    : authHeaders();
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formEncoded ? (body as string) : JSON.stringify(body),
  });
  if (!res.ok) await handleResponseError('POST', path, res);
  return res.json() as Promise<T>;
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleResponseError('PUT', path, res);
  return res.json() as Promise<T>;
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await handleResponseError('DELETE', path, res);
}

// ── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * Login with email + password. Stores the returned token automatically into AsyncStorage.
   */
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const body = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const data = await apiPost<TokenResponse>('/api/auth/login', body, true);
    await setAccessToken(data.access_token);
    return data;
  },

  /**
   * Register a new user account and persist token.
   */
  register: async (email: string, password: string, fullName?: string): Promise<TokenResponse> => {
    const data = await apiPost<TokenResponse>('/api/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    await setAccessToken(data.access_token);
    return data;
  },

  /**
   * Fetch the currently authenticated user's profile.
   */
  me: async (): Promise<User> => {
    return apiGet<User>('/api/auth/me');
  },

  /**
   * Restore user session from persistent AsyncStorage and optionally validate with /api/auth/me.
   * Returns User if token is valid and verified, or null if no token or expired.
   */
  restoreSession: async (): Promise<User | null> => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        _accessToken = null;
        return null;
      }
      _accessToken = token;
      try {
        const user = await authApi.me();
        return user;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        // Explicit 401/403 means token is revoked or expired
        if (message.includes('401') || message.includes('403')) {
          await authApi.logout();
          return null;
        }
        // If offline/network failure, keep token in memory for offline mock data use
        return null;
      }
    } catch (err) {
      console.warn('[LifeLens] Failed to restore session from AsyncStorage:', err);
      return null;
    }
  },

  /**
   * Get the stored access token from AsyncStorage or memory.
   */
  getStoredToken: async (): Promise<string | null> => {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        _accessToken = stored;
        return stored;
      }
    } catch {
      // Fallback to memory
    }
    return _accessToken;
  },

  /**
   * Clear the stored access token from memory and AsyncStorage.
   */
  logout: async (): Promise<void> => {
    await setAccessToken(null);
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return apiPost('/api/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    return apiPost('/api/auth/reset-password', { token, new_password: newPassword });
  },
};

// ── Entries API ───────────────────────────────────────────────────────────────

export const entriesApi = {
  create: async (data: DailyEntryCreate): Promise<{ entry_id: string }> => {
    return apiPost('/api/entries/', data);
  },

  list: async (
    start?: string,
    end?: string,
    page?: number,
    pageSize?: number
  ): Promise<DailyEntry[]> => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    if (page !== undefined) params.set('page', String(page));
    if (pageSize !== undefined) params.set('page_size', String(pageSize));
    const qs = params.toString() ? `?${params}` : '';
    return apiGet(`/api/entries/${qs}`);
  },

  getByDate: async (date: string): Promise<DailyEntry> => {
    return apiGet(`/api/entries/${date}`);
  },

  update: async (date: string, data: DailyEntryUpdate): Promise<DailyEntry> => {
    return apiPut(`/api/entries/${date}`, data);
  },

  delete: async (date: string): Promise<void> => {
    return apiDelete(`/api/entries/${date}`);
  },

  uploadCsv: async (file: File): Promise<CsvUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetchWithTimeout(`${BASE_URL}/api/entries/upload-csv`, {
      method: 'POST',
      headers: _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error(`CSV upload failed: ${res.status}`);
    return res.json();
  },
};

// ── Analytics API ─────────────────────────────────────────────────────────────

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardResponse> => {
    return apiGet('/api/analytics/dashboard');
  },

  getLifeScoreHistory: async (days = 30): Promise<LifeScoreHistoryPoint[]> => {
    return apiGet(`/api/analytics/life-score/history?days=${days}`);
  },

  getInsights: async (date?: string, severity?: string): Promise<InsightResponse[]> => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (severity) params.set('severity', severity);
    const qs = params.toString() ? `?${params}` : '';
    return apiGet(`/api/analytics/insights${qs}`);
  },

  getTomorrowPrediction: async (): Promise<PredictionResponse | null> => {
    return apiGet('/api/analytics/prediction/tomorrow');
  },

  getClusters: async (): Promise<ClusterResponse> => {
    return apiGet('/api/analytics/clusters');
  },

  getAnomalies: async (lastNDays = 7): Promise<AnomalyResponse[]> => {
    return apiGet(`/api/analytics/anomalies?last_n_days=${lastNDays}`);
  },

  getCorrelations: async (): Promise<CorrelationResponse[]> => {
    return apiGet('/api/analytics/correlations');
  },
};

// ── Granular Telemetry API (Phase 1) ─────────────────────────────────────────

export const telemetryApi = {
  // Financial Transactions
  transactions: {
    create: async (data: TransactionCreate): Promise<FinancialTransaction> => {
      return apiPost('/api/telemetry/transactions', data);
    },

    createBatch: async (data: TransactionBatchCreate): Promise<FinancialTransaction[]> => {
      return apiPost('/api/telemetry/transactions/batch', data);
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
      return apiDelete(`/api/telemetry/transactions/${transactionId}`);
    },
  },

  // App Usage Sessions
  appUsage: {
    create: async (data: AppUsageCreate): Promise<AppUsageSession> => {
      return apiPost('/api/telemetry/app-usage', data);
    },

    createBatch: async (data: AppUsageBatchCreate): Promise<AppUsageSession[]> => {
      return apiPost('/api/telemetry/app-usage/batch', data);
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
      return apiPost('/api/telemetry/focus-sessions', data);
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
      return apiPost('/api/telemetry/habits', data);
    },

    list: async (): Promise<HabitWithStreak[]> => {
      return apiGet('/api/telemetry/habits');
    },

    update: async (habitId: string, data: HabitUpdate): Promise<Habit> => {
      return apiPut(`/api/telemetry/habits/${habitId}`, data);
    },

    delete: async (habitId: string): Promise<void> => {
      return apiDelete(`/api/telemetry/habits/${habitId}`);
    },

    logHabit: async (data: HabitLogCreate): Promise<HabitLog> => {
      return apiPost('/api/telemetry/habits/log', data);
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
};

// ── Behavioral Experiments API (Phase 2 - Core Engagement Loop) ─────────────

export const experimentsApi = {
  create: async (data: ExperimentCreate): Promise<Experiment> => {
    return apiPost('/api/experiments', data);
  },

  list: async (
    status?: ExperimentStatus,
    page = 1,
    pageSize = 20
  ): Promise<Experiment[]> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return apiGet(`/api/experiments?${params}`);
  },

  getActive: async (): Promise<ActiveExperimentProgress[]> => {
    return apiGet('/api/experiments/active');
  },

  getTemplates: async (): Promise<ExperimentTemplate[]> => {
    return apiGet('/api/experiments/templates');
  },

  getById: async (experimentId: string): Promise<Experiment> => {
    return apiGet(`/api/experiments/${experimentId}`);
  },

  update: async (experimentId: string, data: ExperimentUpdate): Promise<Experiment> => {
    return apiPut(`/api/experiments/${experimentId}`, data);
  },

  delete: async (experimentId: string): Promise<void> => {
    return apiDelete(`/api/experiments/${experimentId}`);
  },

  checkin: async (
    experimentId: string,
    data: ExperimentCheckinCreate
  ): Promise<ExperimentCheckin> => {
    return apiPost(`/api/experiments/${experimentId}/checkin`, data);
  },

  getCheckins: async (experimentId: string): Promise<ExperimentCheckin[]> => {
    return apiGet(`/api/experiments/${experimentId}/checkins`);
  },

  evaluate: async (experimentId: string): Promise<ExperimentEvaluation> => {
    return apiPost(`/api/experiments/${experimentId}/evaluate`, {});
  },

  complete: async (
    experimentId: string,
    data: ExperimentCompleteRequest
  ): Promise<Experiment> => {
    return apiPost(`/api/experiments/${experimentId}/complete`, data);
  },

  abandon: async (experimentId: string, reason?: string): Promise<Experiment> => {
    const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return apiPost(`/api/experiments/${experimentId}/abandon${qs}`, {});
  },
};

// ── High-level dashboard fetcher (used by existing screens) ───────────────────

/**
 * Fetches and aggregates all dashboard data into the app's DashboardData shape.
 * Falls back to rich mock data if the backend is unreachable.
 */
export async function getDashboardData(): Promise<DashboardData> {
  if (!BASE_URL) return mockDashboardData;

  try {
    const [dashRes, predRes, clustersRes, correlationsRes, anomaliesRes] = await Promise.all([
      analyticsApi.getDashboard(),
      analyticsApi.getTomorrowPrediction().catch(() => null),
      analyticsApi.getClusters().catch(() => null),
      analyticsApi.getCorrelations().catch(() => [] as CorrelationResponse[]),
      analyticsApi.getAnomalies(7).catch(() => [] as AnomalyResponse[]),
    ]);

    const lifeScore: LifeScore = {
      overall: dashRes.life_score ?? 0,
      sleep: dashRes.life_score_components?.sleep ?? 0,
      productivity: dashRes.life_score_components?.productivity ?? 0,
      health: dashRes.life_score_components?.health ?? 0,
      finance: dashRes.life_score_components?.finance ?? 0,
      change: dashRes.life_score_change_from_yesterday ?? 0,
    };

    const trendData: TrendDataPoint[] = (dashRes.trend_data ?? []).map((t) => ({
      date: t.date,
      lifeScore: t.life_score,
      sleep: t.sleep_score,
      productivity: t.productivity_score,
    }));

    const prediction: ProductivityPrediction = {
      score: predRes?.predicted_productivity ?? 0,
      confidence: 'high',
      keyDriver: predRes?.key_driver ?? 'Unknown',
      recommendation: predRes?.improvement_tip ?? 'Keep tracking data for better predictions.',
    };

    const insights: InsightSummary[] = (dashRes.top_insights ?? []).map((i) => ({
      id: i.id,
      title: i.title,
      subtitle: i.message,
      icon: 'bulb-outline',
    }));

    const clusters: BehaviouralCluster[] = (clustersRes?.clusters ?? []).map((c) => ({
      label: c.cluster_name,
      color: '#4A9EFF',
      active: true,
    }));

    const correlations: Correlation[] = (Array.isArray(correlationsRes) ? correlationsRes : []).map(
      (c, idx) => ({
        id: idx.toString(),
        score: c.r,
        positive: c.r > 0,
        title: `${c.name_a} & ${c.name_b}`,
        description: c.insight_message,
      })
    );

    const anomalies: AnomalyAlert[] = (Array.isArray(anomaliesRes) ? anomaliesRes : []).map(
      (a, idx) => ({
        id: idx.toString(),
        date: a.date,
        title: 'Anomaly Detected',
        description: a.insight_message,
        severity: a.anomaly_score > 0.8 ? 'high' : 'medium',
      })
    );

    return {
      lifeScore,
      insight: {
        id: '1',
        title: dashRes.daily_summary?.title ?? 'Daily Summary',
        summary: dashRes.daily_summary?.what ?? 'No summary available.',
        whyItMatters: dashRes.daily_summary?.why ?? '',
        actionForToday: dashRes.daily_summary?.action ?? '',
        type: 'daily',
      },
      scoreBreakdown: [
        { category: 'sleep', score: lifeScore.sleep, weight: 0.25, color: '#00D4AA' },
        { category: 'productivity', score: lifeScore.productivity, weight: 0.25, color: '#4A9EFF' },
        { category: 'health', score: lifeScore.health, weight: 0.25, color: '#B8FF00' },
        { category: 'finance', score: lifeScore.finance, weight: 0.25, color: '#FF9F43' },
      ],
      trendData,
      prediction,
      insights,
      clusters,
      correlations,
      anomalies,
    };
  } catch (error) {
    console.warn(
      '[LifeLens] Live API request failed — falling back to mock data:',
      error
    );
    return mockDashboardData;
  }
}
