/**
 * LifeLens Authentication API Module
 */

import { secureStorage } from '@/src/services/secureStore';
import {
  apiGet,
  apiPost,
  apiDelete,
  setAccessToken,
  setCurrentUserId,
  TOKEN_STORAGE_KEY,
  USER_ID_STORAGE_KEY,
  getAccessToken,
} from './client';
import type { TokenResponse, User } from '@/src/types/api.types';
import { queryCache } from '@/src/utils/queryCache';

export const authApi = {
  /**
   * Login with email + password. Stores the returned token securely.
   */
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const body = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const data = await apiPost<TokenResponse>('/api/auth/login', body, true);
    await setAccessToken(data.access_token);
    await setCurrentUserId(data.user_id);
    queryCache.invalidate();
    return data;
  },

  /**
   * Register a new user account and persist token securely.
   */
  register: async (email: string, password: string, fullName?: string): Promise<TokenResponse> => {
    const data = await apiPost<TokenResponse>('/api/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    await setAccessToken(data.access_token);
    await setCurrentUserId(data.user_id);
    queryCache.invalidate();
    return data;
  },

  /**
   * Fetch the currently authenticated user's profile.
   */
  me: async (): Promise<User> => {
    const user = await apiGet<User>('/api/auth/me');
    await setCurrentUserId(user.id);
    return user;
  },

  /**
   * Restore user session from persistent secure storage and optionally validate with /api/auth/me.
   * Returns User if token is valid and verified, or null if no token or expired.
   */
  restoreSession: async (): Promise<User | null> => {
    try {
      const token = await secureStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        await setAccessToken(null);
        await setCurrentUserId(null);
        return null;
      }
      await setAccessToken(token);
      const storedUserId = await secureStorage.getItem(USER_ID_STORAGE_KEY);
      await setCurrentUserId(storedUserId);

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
      console.warn('[LifeLens AuthApi] Failed to restore session from secure storage:', err);
      return null;
    }
  },

  /**
   * Get the stored access token from secure storage or memory.
   */
  getStoredToken: async (): Promise<string | null> => {
    try {
      const stored = await secureStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        await setAccessToken(stored);
        return stored;
      }
    } catch {
      // Fallback to memory
    }
    return getAccessToken();
  },

  /**
   * Clear the stored access token from memory and secure storage.
   */
  logout: async (): Promise<void> => {
    await setAccessToken(null);
    await setCurrentUserId(null);
    queryCache.invalidate();
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return apiPost('/api/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    return apiPost('/api/auth/reset-password', { token, new_password: newPassword });
  },

  deleteAccount: async (): Promise<void> => {
    await apiDelete('/api/auth/me');
    await setAccessToken(null);
    await setCurrentUserId(null);
    queryCache.invalidate();
  },
};
