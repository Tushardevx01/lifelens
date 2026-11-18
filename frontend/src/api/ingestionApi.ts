/**
 * LifeLens Automated Ingestion & Hardware Connectors API Module
 */

import { apiGet, apiPost } from './client';
import type {
  DataConnector,
  HealthIngestPayload,
  UsageIngestPayload,
  SmsIngestPayload,
  StatementIngestPayload,
  SyncResultResponse,
  ConnectorSyncLog,
} from '@/src/types/api.types';
import { queryCache } from '@/src/utils/queryCache';

export const ingestionApi = {
  getConnectors: async (): Promise<DataConnector[]> => {
    return apiGet<DataConnector[]>('/api/ingestion/connectors');
  },

  toggleConnector: async (
    connectorType: string,
    isEnabled: boolean
  ): Promise<DataConnector> => {
    const res = await apiPost<DataConnector>(`/api/ingestion/connectors/${connectorType}/toggle`, {
      is_enabled: isEnabled,
    });
    queryCache.invalidate('connectors');
    return res;
  },

  ingestHealth: async (payload: HealthIngestPayload): Promise<SyncResultResponse> => {
    const res = await apiPost<SyncResultResponse>('/api/ingestion/health', payload);
    queryCache.invalidate('dashboard');
    return res;
  },

  ingestUsage: async (payload: UsageIngestPayload): Promise<SyncResultResponse> => {
    const res = await apiPost<SyncResultResponse>('/api/ingestion/usage', payload);
    queryCache.invalidate('dashboard');
    return res;
  },

  ingestSms: async (payload: SmsIngestPayload): Promise<SyncResultResponse> => {
    const res = await apiPost<SyncResultResponse>('/api/ingestion/financial/sms', payload);
    queryCache.invalidate('dashboard');
    return res;
  },

  ingestStatement: async (payload: StatementIngestPayload): Promise<SyncResultResponse> => {
    const res = await apiPost<SyncResultResponse>('/api/ingestion/financial/statement', payload);
    queryCache.invalidate('dashboard');
    return res;
  },

  getLogs: async (limit = 20): Promise<ConnectorSyncLog[]> => {
    return apiGet<ConnectorSyncLog[]>(`/api/ingestion/logs?limit=${limit}`);
  },

  triggerSync: async (): Promise<{ status: string; active_connectors: string[]; message: string }> => {
    const res = await apiPost<{ status: string; active_connectors: string[]; message: string }>(
      '/api/ingestion/sync',
      {}
    );
    queryCache.invalidate('dashboard');
    return res;
  },

  testWebhook: async (payload: { provider: string; event_type: string; transactions: unknown[] }): Promise<SyncResultResponse> => {
    const res = await apiPost<SyncResultResponse>('/api/ingestion/financial/webhook', payload);
    queryCache.invalidate('dashboard');
    return res;
  },
};
