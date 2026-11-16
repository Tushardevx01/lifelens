/**
 * LifeLens Native Screen Time & App Usage Tracker
 *
 * Standalone on-device digital habits engine that does NOT require external bridges.
 *
 * Capabilities:
 * - Listens to React Native AppState to track foreground active time and device unlocks.
 * - Increments daily device unlocks on each transition to 'active'.
 * - Records granular app usage sessions with auto-tagged late-night flags (22:00 to 05:59).
 * - Computes Distraction Index (ratio of distracting apps to productive apps).
 * - Dispatches sessions to `/api/telemetry/app-usage` and rolls up to DailyEntry.
 */

export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

interface AppStateListener {
  remove: () => void;
}

interface AppStateModule {
  currentState: AppStateStatus;
  addEventListener: (type: 'change', handler: (state: AppStateStatus) => void) => AppStateListener;
}

function getAppStateModule(): AppStateModule {
  try {
    const rn = require('react-native');
    if (rn && rn.AppState) return rn.AppState;
  } catch {
    // Node.js test environment fallback
  }
  return {
    currentState: 'active',
    addEventListener: () => ({ remove: () => {} }),
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { telemetryApi, entriesApi } from '@/src/services/api';
import type { AppUsageSession, AppUsageSummary } from '@/src/types/api.types';

export interface NativeScreenState {
  date: string;
  totalScreenMinutes: number;
  socialMediaMinutes: number;
  unlockCount: number;
  sessions: Array<{
    appName: string;
    appCategory: string;
    durationMinutes: number;
    startTime: string;
    isLateNight: boolean;
  }>;
}

const STORAGE_KEY_PREFIX = '@lifelens_native_screen_';

export const DISTRACTING_CATEGORIES = new Set([
  'Social Media',
  'Entertainment',
  'Games',
  'Gaming',
]);

export const PRODUCTIVE_CATEGORIES = new Set([
  'Productivity',
  'Work & Tools',
  'Utilities',
  'Education',
  'Study',
]);

/**
 * Checks if a given timestamp falls between 22:00 and 05:59 local time.
 */
export function isLateNightHour(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}

/**
 * Computes Distraction Index given distracting minutes and productive minutes.
 * Returns ratio between 0.0 and 1.0 (or 0.0 if both are 0).
 */
export function computeDistractionIndex(
  distractingMinutes: number,
  productiveMinutes: number
): number {
  const total = distractingMinutes + productiveMinutes;
  if (total <= 0) return 0.0;
  return Math.round((distractingMinutes / total) * 100) / 100;
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

class NativeScreenTrackerManager {
  private currentAppState: AppStateStatus = getAppStateModule().currentState;
  private activeStartTime: number | null = null;
  private isListening = false;
  private appStateSubscription: { remove: () => void } | null = null;

  public async getTodayState(dateStr = getTodayString()): Promise<NativeScreenState> {
    try {
      const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${dateStr}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // return default
    }
    return {
      date: dateStr,
      totalScreenMinutes: 0,
      socialMediaMinutes: 0,
      unlockCount: 0,
      sessions: [],
    };
  }

  public async saveTodayState(state: NativeScreenState): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEY_PREFIX}${state.date}`,
        JSON.stringify(state)
      );
    } catch (err) {
      console.warn('[nativeScreenTracker] Failed to save state to AsyncStorage:', err);
    }
  }

  public startTracking(): void {
    if (this.isListening) return;
    this.isListening = true;
    this.activeStartTime = Date.now();

    const appState = getAppStateModule();
    // Increment unlock on startup if active
    if (appState.currentState === 'active') {
      this.handleTransitionToActive();
    }

    this.appStateSubscription = appState.addEventListener('change', this.handleAppStateChange);
  }

  public stopTracking(): void {
    if (!this.isListening) return;
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isListening = false;
    this.flushActiveDuration();
  }

  private handleAppStateChange = async (nextState: AppStateStatus) => {
    if (this.currentAppState.match(/inactive|background/) && nextState === 'active') {
      // Device unlocked / app brought to foreground
      this.activeStartTime = Date.now();
      await this.handleTransitionToActive();
    } else if (this.currentAppState === 'active' && nextState.match(/inactive|background/)) {
      // App went to background
      await this.flushActiveDuration();
    }
    this.currentAppState = nextState;
  };

  private async handleTransitionToActive(): Promise<void> {
    const today = getTodayString();
    const state = await this.getTodayState(today);
    state.unlockCount += 1;
    await this.saveTodayState(state);

    // Sync unlock count rollup to backend
    this.syncDailyEntry(state);
  }

  private async flushActiveDuration(): Promise<void> {
    if (!this.activeStartTime) return;
    const elapsedSeconds = Math.max(0, (Date.now() - this.activeStartTime) / 1000);
    this.activeStartTime = null;

    const elapsedMinutes = Math.round((elapsedSeconds / 60) * 10) / 10;
    if (elapsedMinutes <= 0) return;

    const today = getTodayString();
    const state = await this.getTodayState(today);
    state.totalScreenMinutes += elapsedMinutes;
    await this.saveTodayState(state);

    this.syncDailyEntry(state);
  }

  /**
   * Records a granular app session (e.g. Instagram, Slack, VS Code).
   */
  public async recordAppSession(input: {
    appName: string;
    appCategory: string;
    durationMinutes: number;
    startTime?: string;
  }): Promise<{
    session: AppUsageSession;
    summary: AppUsageSummary;
    distractionIndex: number;
  }> {
    const startDate = input.startTime ? new Date(input.startTime) : new Date();
    const isLateNight = isLateNightHour(startDate);
    const today = getTodayString();

    const state = await this.getTodayState(today);
    state.totalScreenMinutes += input.durationMinutes;

    if (input.appCategory === 'Social Media') {
      state.socialMediaMinutes += input.durationMinutes;
    }

    state.sessions.push({
      appName: input.appName,
      appCategory: input.appCategory,
      durationMinutes: input.durationMinutes,
      startTime: startDate.toISOString(),
      isLateNight,
    });

    await this.saveTodayState(state);

    // Dispatch to backend telemetry
    let createdSession: AppUsageSession;
    try {
      createdSession = await telemetryApi.appUsage.create({
        app_name: input.appName,
        app_category: input.appCategory,
        duration_minutes: input.durationMinutes,
        start_time: startDate.toISOString(),
        is_late_night: isLateNight,
      });
    } catch {
      // Mock session fallback if offline
      createdSession = {
        id: `local_${Date.now()}`,
        user_id: 'local_user',
        app_name: input.appName,
        app_category: input.appCategory,
        duration_minutes: input.durationMinutes,
        start_time: startDate.toISOString(),
        is_late_night: isLateNight,
        created_at: new Date().toISOString(),
      };
    }

    // Update DailyEntry
    await this.syncDailyEntry(state);

    // Fetch updated summary
    let summary: AppUsageSummary;
    try {
      summary = await telemetryApi.appUsage.getSummary();
    } catch {
      // Local fallback computation
      let distracting = 0;
      let productive = 0;
      for (const s of state.sessions) {
        if (DISTRACTING_CATEGORIES.has(s.appCategory)) distracting += s.durationMinutes;
        if (PRODUCTIVE_CATEGORIES.has(s.appCategory)) productive += s.durationMinutes;
      }
      const idx = computeDistractionIndex(distracting, productive);
      summary = {
        total_minutes: state.totalScreenMinutes,
        total_hours: Math.round((state.totalScreenMinutes / 60) * 10) / 10,
        late_night_minutes: state.sessions.filter((s) => s.isLateNight).reduce((acc, s) => acc + s.durationMinutes, 0),
        distracting_minutes: distracting,
        productive_minutes: productive,
        distraction_index: idx,
        category_breakdown: {},
        top_apps: [],
      };
    }

    return {
      session: createdSession,
      summary,
      distractionIndex: summary.distraction_index ?? 0,
    };
  }

  private async syncDailyEntry(state: NativeScreenState): Promise<void> {
    const screenHours = Math.round((state.totalScreenMinutes / 60) * 100) / 100;
    const socialHours = Math.round((state.socialMediaMinutes / 60) * 100) / 100;

    try {
      await entriesApi.update(state.date, {
        screen_time_hours: screenHours,
        social_media_hours: socialHours,
        unlock_count: state.unlockCount,
      });
    } catch {
      try {
        await entriesApi.create({
          date: state.date,
          sleep_hours: 0,
          sleep_quality: 3,
          screen_time_hours: screenHours,
          social_media_hours: socialHours,
          unlock_count: state.unlockCount,
          steps: 0,
          deep_work_hours: 0,
          daily_spend: 0,
        });
      } catch {
        // silent
      }
    }
  }
}

export const nativeScreenTracker = new NativeScreenTrackerManager();
