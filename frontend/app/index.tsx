import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Pressable,
  StatusBar,
  Platform,
} from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authApi, checkBackendHealth } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { CONFIG } from '@/src/config';

export default function RootIndex() {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const verifyAndProceed = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    try {
      const health = await checkBackendHealth();
      if (!health.ok) {
        setBackendOnline(false);
        setChecking(false);
        setRetrying(false);
        Alert.alert(
          'Backend Not Running',
          `Without backend, no entry.\n\nThe LifeLens backend server is not running or unreachable at ${CONFIG.API_URL}.\n\nPlease start the backend server to continue.`,
          [
            {
              text: 'Retry Connection',
              onPress: () => verifyAndProceed(true),
            },
          ]
        );
        return;
      }

      setBackendOnline(true);
      const user = await authApi.restoreSession().catch(() => null);
      setIsAuthenticated(Boolean(user));
    } catch {
      setBackendOnline(false);
      Alert.alert(
        'Backend Not Running',
        `Without backend, no entry.\n\nCould not connect to ${CONFIG.API_URL}. Please start the backend server.`,
        [
          {
            text: 'Retry Connection',
            onPress: () => verifyAndProceed(true),
          },
        ]
      );
    } finally {
      setChecking(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    verifyAndProceed();
  }, [verifyAndProceed]);

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={colors.darkButton} />
        <Text style={styles.loadingText}>Connecting to LifeLens backend...</Text>
      </View>
    );
  }

  // If backend is offline, block entry completely and show retry gate screen
  if (backendOnline === false) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 24) }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.gateCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-offline" size={38} color="#DC2626" />
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>CONNECTION REQUIRED</Text>
          </View>

          <Text style={styles.gateTitle}>Backend Server Offline</Text>
          <Text style={styles.gateHighlight}>Without backend, no entry.</Text>

          <Text style={styles.gateDesc}>
            LifeLens requires a live connection to your FastAPI backend server to authenticate, fetch personal telemetry, and compute health models. No mock data will be used.
          </Text>

          <View style={styles.urlBox}>
            <Ionicons name="link-outline" size={14} color={colors.textMuted} />
            <Text style={styles.urlText}>{CONFIG.API_URL}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.btnPressed,
              retrying && styles.btnDisabled,
            ]}
            onPress={() => verifyAndProceed(true)}
            disabled={retrying}
            accessibilityRole="button"
            accessibilityLabel="Retry backend connection"
          >
            {retrying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  gateCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryText,
    marginBottom: 4,
    textAlign: 'center',
  },
  gateHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  gateDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginBottom: spacing.xl,
  },
  urlText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  retryBtn: {
    width: '100%',
    backgroundColor: colors.darkButton,
    paddingVertical: 14,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
