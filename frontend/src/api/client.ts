/**
 * LifeLens API Client Core Transport
 *
 * Provides:
 * - Robust fetch with configurable timeouts and AbortController
 * - Hardware-backed secure token management via secureStorage
 * - Global HTTP 401/403 session expiration interceptor
 * - Offline-first mutation queue interceptor for transparent background synchronization
 */

import { CONFIG } from '@/src/config';
import { secureStorage } from '@/src/services/secureStore';
import { offlineSyncService } from '@/src/services/offlineSyncService';
import { authEvents } from '@/src/services/authEvents';
import { queryCache } from '@/src/utils/queryCache';

export const TOKEN_STORAGE_KEY = '@lifelens_access_token';
export const USER_ID_STORAGE_KEY = '@lifelens_user_id';

let _accessToken: string | null = null;
let _currentUserId: string | null = null;

export async function setCurrentUserId(userId: string | null): Promise<void> {
  _currentUserId = userId;
  try {
    if (userId) {
      await secureStorage.setItem(USER_ID_STORAGE_KEY, userId);
    } else {
      await secureStorage.deleteItem(USER_ID_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[LifeLens Client] Failed to persist user id in secure storage:', err);
  }
}

export function getCurrentUserId(): string | null {
  return _currentUserId;
}

export async function setAccessToken(token: string | null): Promise<void> {
  _accessToken = token;
  try {
    if (token) {
      await secureStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      await secureStorage.deleteItem(TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[LifeLens Client] Failed to persist access token in secure storage:', err);
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export const REQUEST_TIMEOUT_MS = 8000;
export const BASE_URL = CONFIG.API_URL;

export async function handleResponseError(method: string, path: string, res: Response): Promise<never> {
  // Global 401 Session Interceptor: automatically tear down session and broadcast event
  if (res.status === 401) {
    _accessToken = null;
    _currentUserId = null;
    try {
      await secureStorage.deleteItem(TOKEN_STORAGE_KEY);
      await secureStorage.deleteItem(USER_ID_STORAGE_KEY);
    } catch {
      // Ignore secure storage deletion errors on 401 teardown
    }
    queryCache.invalidate();
    authEvents.notifyUnauthorized();
  }

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

export async function fetchWithTimeout(
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

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!res.ok) await handleResponseError('GET', path, res);
  return res.json() as Promise<T>;
}

export async function apiGetText(path: string): Promise<string> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: authHeaders({ Accept: 'text/html, text/plain, */*' }),
  });
  if (!res.ok) await handleResponseError('GET', path, res);
  return res.text();
}

export async function apiPost<T>(path: string, body: unknown, formEncoded = false): Promise<T> {
  const isAuth = path.startsWith('/api/auth');
  if (!isAuth && !offlineSyncService.isOnline()) {
    const queued = await offlineSyncService.enqueueMutation(path, 'POST', body, _currentUserId);
    return { queued: true, mutationId: queued.id, optimistic: true } as unknown as T;
  }
  const headers: Record<string, string> = formEncoded
    ? { 'Content-Type': 'application/x-www-form-urlencoded' }
    : authHeaders();
  try {
    const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formEncoded ? (body as string) : JSON.stringify(body),
    });
    if (!res.ok) await handleResponseError('POST', path, res);
    return res.json() as Promise<T>;
  } catch (err: unknown) {
    if (
      !isAuth &&
      (err instanceof TypeError ||
        (err instanceof Error &&
          (err.name === 'AbortError' ||
            err.message.includes('fetch') ||
            err.message.includes('Network') ||
            err.message.includes('Failed to fetch'))))
    ) {
      const queued = await offlineSyncService.enqueueMutation(path, 'POST', body, _currentUserId);
      return { queued: true, mutationId: queued.id, optimistic: true } as unknown as T;
    }
    throw err;
  }
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) await handleResponseError('POST', path, res);
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const isAuth = path.startsWith('/api/auth');
  if (!isAuth && !offlineSyncService.isOnline()) {
    const queued = await offlineSyncService.enqueueMutation(path, 'PUT', body, _currentUserId);
    return { queued: true, mutationId: queued.id, optimistic: true } as unknown as T;
  }
  try {
    const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) await handleResponseError('PUT', path, res);
    return res.json() as Promise<T>;
  } catch (err: unknown) {
    if (
      !isAuth &&
      (err instanceof TypeError ||
        (err instanceof Error &&
          (err.name === 'AbortError' ||
            err.message.includes('fetch') ||
            err.message.includes('Network') ||
            err.message.includes('Failed to fetch'))))
    ) {
      const queued = await offlineSyncService.enqueueMutation(path, 'PUT', body, _currentUserId);
      return { queued: true, mutationId: queued.id, optimistic: true } as unknown as T;
    }
    throw err;
  }
}

export async function apiDelete(path: string): Promise<void> {
  if (!offlineSyncService.isOnline()) {
    await offlineSyncService.enqueueMutation(path, 'DELETE', {}, _currentUserId);
    return;
  }
  try {
    const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) await handleResponseError('DELETE', path, res);
  } catch (err: unknown) {
    if (
      err instanceof TypeError ||
      (err instanceof Error &&
        (err.name === 'AbortError' ||
          err.message.includes('fetch') ||
          err.message.includes('Network') ||
          err.message.includes('Failed to fetch')))
    ) {
      await offlineSyncService.enqueueMutation(path, 'DELETE', {}, _currentUserId);
      return;
    }
    throw err;
  }
}
