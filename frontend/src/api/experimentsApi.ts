/**
 * LifeLens Behavioral Experiments API Module (Phase 2 - Core Engagement Loop)
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type {
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
import { queryCache } from '@/src/utils/queryCache';

export const experimentsApi = {
  create: async (data: ExperimentCreate): Promise<Experiment> => {
    const res = await apiPost<Experiment>('/api/experiments', data);
    queryCache.invalidate('dashboard');
    queryCache.invalidate('experiments');
    return res;
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
    const res = await apiPut<Experiment>(`/api/experiments/${experimentId}`, data);
    queryCache.invalidate('dashboard');
    queryCache.invalidate('experiments');
    return res;
  },

  delete: async (experimentId: string): Promise<void> => {
    await apiDelete(`/api/experiments/${experimentId}`);
    queryCache.invalidate('dashboard');
    queryCache.invalidate('experiments');
  },

  checkin: async (
    experimentId: string,
    data: ExperimentCheckinCreate
  ): Promise<ExperimentCheckin> => {
    const res = await apiPost<ExperimentCheckin>(`/api/experiments/${experimentId}/checkin`, data);
    queryCache.invalidate('dashboard');
    return res;
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
    const res = await apiPost<Experiment>(`/api/experiments/${experimentId}/complete`, data);
    queryCache.invalidate('dashboard');
    queryCache.invalidate('experiments');
    return res;
  },

  abandon: async (experimentId: string, reason?: string): Promise<Experiment> => {
    const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const res = await apiPost<Experiment>(`/api/experiments/${experimentId}/abandon${qs}`, {});
    queryCache.invalidate('dashboard');
    queryCache.invalidate('experiments');
    return res;
  },
};
