/**
 * LifeLens AI Personal Life Briefings API Module (Morning & Weekly Reviews)
 */

import { apiGet, apiGetText } from './client';
import type { DailyMorningBriefing, WeeklyReviewStory } from '@/src/types/api.types';

export const briefingsApi = {
  getMorning: async (targetDate?: string): Promise<DailyMorningBriefing> => {
    const qs = targetDate ? `?date=${encodeURIComponent(targetDate)}` : '';
    return apiGet(`/api/analytics/briefing/morning${qs}`);
  },

  getWeekly: async (targetDate?: string): Promise<WeeklyReviewStory> => {
    const qs = targetDate ? `?date=${encodeURIComponent(targetDate)}` : '';
    return apiGet(`/api/analytics/briefing/weekly${qs}`);
  },

  exportHtml: async (
    briefingType: 'DAILY_MORNING' | 'WEEKLY_REVIEW' = 'WEEKLY_REVIEW'
  ): Promise<string> => {
    return apiGetText(
      `/api/analytics/briefing/export?briefing_type=${briefingType}&export_format=html`
    );
  },

  exportMarkdown: async (
    briefingType: 'DAILY_MORNING' | 'WEEKLY_REVIEW' = 'WEEKLY_REVIEW'
  ): Promise<string> => {
    return apiGetText(
      `/api/analytics/briefing/export?briefing_type=${briefingType}&export_format=markdown`
    );
  },
};
