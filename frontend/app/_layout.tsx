import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { authEvents } from '@/src/services/authEvents';
import { offlineSyncService } from '@/src/services/offlineSyncService';
import { syncOfflineMutations } from '@/src/services/api';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: 'login',
};

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && Platform.OS !== 'web') {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded && Platform.OS !== 'web') {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. Initialize offline sync engine
    offlineSyncService.initialize().catch(() => {});

    // 2. Automatically drain offline outbox mutations upon network reconnection
    const unsubscribeReconnect = offlineSyncService.onReconnect(() => {
      syncOfflineMutations().catch((err) => {
        console.warn('[OfflineSync] Automatic reconnection reconciliation error:', err);
      });
    });

    // 3. Listen for global HTTP 401/403 session expiration
    const unsubscribeAuth = authEvents.onUnauthorized(() => {
      const currentRoute = segments.join('/');
      if (!currentRoute.includes('login') && !currentRoute.includes('signup')) {
        console.warn('[Session] Session expired or unauthorized, safely redirecting to /login');
        router.replace('/login');
      }
    });

    return () => {
      unsubscribeReconnect();
      unsubscribeAuth();
    };
  }, [router, segments]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
