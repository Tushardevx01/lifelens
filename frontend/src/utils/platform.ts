/**
 * Safe cross-platform runtime environment detection.
 * Works seamlessly in React Native (iOS/Android), Metro Web, and Node.js test runner.
 */

export type PlatformOS = 'ios' | 'android' | 'web';

export function isNativePlatform(): boolean {
  // Pure Node.js / test runner environment
  if (typeof process !== 'undefined' && process.versions?.node && !process.env.EXPO_NATIVE) {
    return false;
  }
  if (typeof window !== 'undefined') {
    return false;
  }
  try {
    // In React Native mobile runtime
    const rn = require('react-native');
    return rn?.Platform?.OS === 'ios' || rn?.Platform?.OS === 'android';
  } catch {
    return false;
  }
}

export function getPlatformOS(): PlatformOS {
  if (typeof process !== 'undefined' && process.versions?.node && !process.env.EXPO_NATIVE) {
    return 'web';
  }
  try {
    // In Metro / React Native runtime
    const rn = require('react-native');
    if (rn?.Platform?.OS) {
      return rn.Platform.OS as PlatformOS;
    }
  } catch {
    // In Node.js or non-RN environment
  }

  if (typeof window !== 'undefined') {
    return 'web';
  }

  return 'android';
}
