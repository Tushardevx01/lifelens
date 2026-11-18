/**
 * LifeLens Behavioral Risk Forecasters & Dynamic Correlations API Module
 */

import { apiGet } from './client';
import type { CompositeRiskForecastResponse, DynamicCorrelation } from '@/src/types/api.types';

export const forecastsApi = {
  getRisks: async (targetDate?: string): Promise<CompositeRiskForecastResponse> => {
    const qs = targetDate ? `?date=${encodeURIComponent(targetDate)}` : '';
    return apiGet(`/api/analytics/forecasts/risks${qs}`);
  },

  getDynamicCorrelations: async (minSampleSize = 7): Promise<DynamicCorrelation[]> => {
    return apiGet(`/api/analytics/correlations/dynamic?min_sample_size=${minSampleSize}`);
  },
};
