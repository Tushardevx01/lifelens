/**
 * LifeLens Central Configuration & Dynamic API URL Resolver
 *
 * Automatically resolves the FastAPI backend URL based on the runtime environment:
 * 1. Honors explicit non-loopback EXPO_PUBLIC_API_URL (e.g. production domain or explicit LAN IP).
 * 2. On Web: mirrors the active browser hostname (e.g. localhost:8000 or <lan-ip>:8000).
 * 3. On Native in Expo Go / Dev Client:
 *    Extracts the developer's computer LAN IP from Expo Constants (`hostUri` / `debuggerHost`).
 *    This allows a physical mobile device scanning the Expo Go QR code over Wi-Fi
 *    to connect directly to the FastAPI server running on port 8000 of the development machine.
 * 4. On Android Emulator: falls back to `http://10.0.2.2:8000` (host loopback in QEMU/Android emulator).
 * 5. On iOS Simulator / pure test runner: falls back to `http://localhost:8000`.
 */

import { getPlatformOS } from '@/src/utils/platform';

let _customApiUrl: string | null = null;

/**
 * Extracts host IP/hostname from Expo Go / Metro development server.
 */
export function getExpoDevServerHost(): string | null {
  try {
    const Constants = require('expo-constants')?.default ?? require('expo-constants');
    const rawUri: unknown =
      Constants?.expoConfig?.hostUri ??
      Constants?.manifest2?.extra?.expoGo?.debuggerHost ??
      Constants?.manifest?.debuggerHost ??
      Constants?.linkingUri ??
      Constants?.experienceUrl;

    if (typeof rawUri === 'string' && rawUri.length > 0) {
      // Clean scheme and paths: e.g. "exp://10.1.12.79:8081" or "10.1.12.79:8081" -> "10.1.12.79"
      const withoutScheme = rawUri.replace(/^[a-z]+:\/\//i, '');
      const host = withoutScheme.split(':')[0].replace(/[/\\]+.*$/, '').trim();
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  } catch {
    // Expo constants not available or running outside Expo runtime
  }
  return null;
}

/**
 * Resolves the backend API URL dynamically based on environment.
 */
export function resolveApiUrl(): string {
  const configured = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  const isLoopback =
    !configured ||
    configured.includes('localhost') ||
    configured.includes('127.0.0.1');

  // If a production or custom non-loopback URL is explicitly configured, use it
  if (configured && !isLoopback) {
    return configured.replace(/\/+$/, '');
  }

  const os = getPlatformOS();

  // 1. Web Runtime
  if (os === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:8000`;
      }
    }
    return configured.replace(/\/+$/, '') || 'http://localhost:8000';
  }

  // 2. Native Mobile (Expo Go / Physical Device over Wi-Fi)
  const devHost = getExpoDevServerHost();
  if (devHost) {
    return `http://${devHost}:8000`;
  }

  // 3. Android Emulator fallback (host machine loopback inside emulator)
  if (os === 'android') {
    return 'http://10.0.2.2:8000';
  }

  // 4. iOS Simulator / Default
  return configured.replace(/\/+$/, '') || 'http://localhost:8000';
}

export function getApiUrl(): string {
  return _customApiUrl || resolveApiUrl();
}

export function setApiUrl(url: string | null): void {
  _customApiUrl = url ? url.trim().replace(/\/+$/, '') : null;
}

export const CONFIG = {
  APP_NAME: 'LifeLens',
  VERSION: '1.0.0',
  get API_URL(): string {
    return getApiUrl();
  },
};

export default CONFIG;
