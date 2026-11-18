/**
 * LifeLens Secure Storage Service
 *
 * Provides hardware-backed encrypted storage using Keychain (iOS) and Keystore (Android)
 * via expo-secure-store. Falls back safely to AsyncStorage on Web and headless test runners.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isNativePlatform } from '@/src/utils/platform';

// Lazy-resolve expo-secure-store to prevent web and SSR build errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SecureStoreModule: any = null;
try {
  if (isNativePlatform()) {
    SecureStoreModule = require('expo-secure-store');
  }
} catch {
  SecureStoreModule = null;
}

export const secureStorage = {
  /**
   * Securely persists a key-value string.
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isNativePlatform() && SecureStoreModule?.setItemAsync) {
        await SecureStoreModule.setItemAsync(key, value);
        return;
      }
    } catch (err) {
      console.warn(`[LifeLens SecureStore] Native storage write failed for ${key}, falling back:`, err);
    }
    await AsyncStorage.setItem(key, value);
  },

  /**
   * Securely reads a key-value string.
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (isNativePlatform() && SecureStoreModule?.getItemAsync) {
        const val = await SecureStoreModule.getItemAsync(key);
        if (val !== null) return val;
      }
    } catch (err) {
      console.warn(`[LifeLens SecureStore] Native storage read failed for ${key}, falling back:`, err);
    }
    return AsyncStorage.getItem(key);
  },

  /**
   * Securely deletes a key.
   */
  async deleteItem(key: string): Promise<void> {
    try {
      if (isNativePlatform() && SecureStoreModule?.deleteItemAsync) {
        await SecureStoreModule.deleteItemAsync(key);
        return;
      }
    } catch (err) {
      console.warn(`[LifeLens SecureStore] Native storage delete failed for ${key}, falling back:`, err);
    }
    await AsyncStorage.removeItem(key);
  },
};
