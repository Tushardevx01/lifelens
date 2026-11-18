import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Pressable,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authApi, checkBackendHealth, setBaseUrl } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { CONFIG } from '@/src/config';

const STORAGE_CUSTOM_URL_KEY = '@lifelens_custom_api_url';

export default function RootIndex() {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Edit Server URL Modal
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState(CONFIG.API_URL);
  const [savingUrl, setSavingUrl] = useState(false);

  const verifyAndProceed = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    try {
      // 1. Check for stored custom URL override
      const savedCustomUrl = await AsyncStorage.getItem(STORAGE_CUSTOM_URL_KEY);
      if (savedCustomUrl && savedCustomUrl.trim()) {
        setBaseUrl(savedCustomUrl.trim());
      }

      // 2. Test backend health
      const health = await checkBackendHealth();
      if (!health.ok) {
        setBackendOnline(false);
        setChecking(false);
        setRetrying(false);
        if (isRetry) {
          Alert.alert(
            'Backend Unreachable',
            `Could not connect to the LifeLens server at:\n\n${CONFIG.API_URL}\n\nMake sure the FastAPI backend is running and that your device is on the same network.`,
            [
              { text: 'Edit URL', onPress: () => setUrlModalVisible(true) },
              { text: 'Retry', onPress: () => verifyAndProceed(true) },
            ]
          );
        }
        return;
      }

      setBackendOnline(true);
      const user = await authApi.restoreSession().catch(() => null);
      setIsAuthenticated(Boolean(user));
    } catch {
      setBackendOnline(false);
      if (isRetry) {
        Alert.alert(
          'Backend Unreachable',
          `Could not connect to ${CONFIG.API_URL}. Please verify your connection or update the server URL.`,
          [
            { text: 'Edit URL', onPress: () => setUrlModalVisible(true) },
            { text: 'Retry', onPress: () => verifyAndProceed(true) },
          ]
        );
      }
    } finally {
      setChecking(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    verifyAndProceed();
  }, [verifyAndProceed]);

  const handleSaveUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
      return;
    }
    setSavingUrl(true);
    try {
      await AsyncStorage.setItem(STORAGE_CUSTOM_URL_KEY, trimmed);
      setBaseUrl(trimmed);
      setUrlModalVisible(false);
      setChecking(true);
      await verifyAndProceed(false);
    } catch {
      Alert.alert('Error', 'Failed to save server URL.');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleResetUrl = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_CUSTOM_URL_KEY);
      setUrlInput(CONFIG.API_URL);
      setBaseUrl(CONFIG.API_URL);
      setUrlModalVisible(false);
      setChecking(true);
      await verifyAndProceed(false);
    } catch {
      // ignore
    }
  };

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

          {/* Current Target URL with Edit Button */}
          <Pressable
            style={styles.urlBox}
            onPress={() => {
              setUrlInput(CONFIG.API_URL);
              setUrlModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit server URL"
          >
            <Ionicons name="link-outline" size={14} color={colors.textMuted} />
            <Text style={styles.urlText} numberOfLines={1}>
              {CONFIG.API_URL}
            </Text>
            <Ionicons name="pencil" size={12} color={colors.primaryText} style={{ marginLeft: 4 }} />
          </Pressable>

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

          {/* Edit Server URL secondary action */}
          <Pressable
            style={styles.changeUrlBtn}
            onPress={() => {
              setUrlInput(CONFIG.API_URL);
              setUrlModalVisible(true);
            }}
          >
            <Text style={styles.changeUrlText}>Configure Server Address</Text>
          </Pressable>
        </View>

        {/* Modal: Configure Server URL */}
        <Modal
          visible={urlModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setUrlModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="server-outline" size={24} color={colors.primaryText} />
                <Text style={styles.modalTitle}>Backend Server Address</Text>
              </View>

              <Text style={styles.modalSubtitle}>
                Enter the IP address of your computer running FastAPI (e.g. over local Wi-Fi or tunnel):
              </Text>

              <TextInput
                style={styles.urlTextInput}
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="http://192.168.x.x:8000"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setUrlModalVisible(false)}
                  disabled={savingUrl}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={handleSaveUrl}
                  disabled={savingUrl}
                >
                  {savingUrl ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save & Connect</Text>
                  )}
                </Pressable>
              </View>

              <Pressable style={styles.resetBtn} onPress={handleResetUrl}>
                <Text style={styles.resetBtnText}>Reset to Default</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginBottom: spacing.lg,
  },
  urlText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    maxWidth: 240,
  },
  retryBtn: {
    width: '100%',
    backgroundColor: colors.darkButton,
    paddingVertical: 14,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  changeUrlBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  changeUrlText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  urlTextInput: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.primaryText,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.darkButton,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  resetBtnText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
