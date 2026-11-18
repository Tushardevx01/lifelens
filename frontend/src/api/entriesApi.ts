/**
 * LifeLens Daily Entries API Module
 */

import { apiGet, apiPost, apiPut, apiDelete, fetchWithTimeout, BASE_URL, getAccessToken } from './client';
import type { DailyEntry, DailyEntryCreate, DailyEntryUpdate, CsvUploadResponse } from '@/src/types/api.types';
import { queryCache } from '@/src/utils/queryCache';

export const entriesApi = {
  create: async (data: DailyEntryCreate): Promise<{ entry_id: string }> => {
    const res = await apiPost<{ entry_id: string }>('/api/entries/', data);
    queryCache.invalidate('dashboard');
    queryCache.invalidate('entries');
    return res;
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

  /** Fetches every page so clear/export/history are not capped at the server's default 30 rows. */
  listAll: async (start?: string, end?: string): Promise<DailyEntry[]> => {
    const pageSize = 100;
    const all: DailyEntry[] = [];
    for (let page = 1; page <= 100; page++) {
      const batch = await entriesApi.list(start, end, page, pageSize);
      all.push(...batch);
      if (batch.length < pageSize) break;
    }
    return all;
  },

  getByDate: async (date: string): Promise<DailyEntry> => {
    return apiGet(`/api/entries/${date}`);
  },

  update: async (date: string, data: DailyEntryUpdate): Promise<DailyEntry> => {
    const res = await apiPut<DailyEntry>(`/api/entries/${date}`, data);
    queryCache.invalidate('dashboard');
    queryCache.invalidate('entries');
    return res;
  },

  delete: async (date: string): Promise<void> => {
    await apiDelete(`/api/entries/${date}`);
    queryCache.invalidate('dashboard');
    queryCache.invalidate('entries');
  },

  uploadCsv: async (file: File): Promise<CsvUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAccessToken();
    const res = await fetchWithTimeout(`${BASE_URL}/api/entries/upload-csv`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error(`CSV upload failed: ${res.status}`);
    queryCache.invalidate('dashboard');
    queryCache.invalidate('entries');
    return res.json();
  },
};
