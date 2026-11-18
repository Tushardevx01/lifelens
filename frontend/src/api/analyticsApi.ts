/**
 * LifeLens Analytics API Module
 */

import { apiGet } from './client';
import type {
  DashboardResponse,
  LifeScoreHistoryPoint,
  InsightResponse,
  PredictionResponse,
  ClusterResponse,
  AnomalyResponse,
  CorrelationResponse,
} from '@/src/types/api.types';

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
