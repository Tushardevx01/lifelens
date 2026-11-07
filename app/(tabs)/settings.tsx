/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { authApi, entriesApi, getDashboardData } from '@/src/services/api';
import type { User, DailyEntry } from '@/src/types/api.types';
import { seedDemoDataset } from '@/src/features/dashboard/demoData';

const STORAGE_KEYS = {
  DAILY_INSIGHTS: '@lifelens_settings_daily_insights',
  ANOMALY_ALERTS: '@lifelens_settings_anomaly_alerts',
  FOCUS_TRACKING: '@lifelens_settings_focus_tracking',
  HAPTICS: '@lifelens_settings_haptics',
  CLOUD_SYNC: '@lifelens_settings_cloud_sync',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  // User state
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [lifeScore, setLifeScore] = useState<number>(84.5);
  const [actionLoading, setActionLoading] = useState(false);

  // Settings state toggles
  const [dailyInsights, setDailyInsights] = useState(true);
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);
  const [focusTracking, setFocusTracking] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [cloudSync, setCloudSync] = useState(true);

  // Load persisted toggle settings
  useEffect(() => {
    async function loadPreferences() {
      try {
        const [di, aa, ft, hp, cs] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.DAILY_INSIGHTS),
          AsyncStorage.getItem(STORAGE_KEYS.ANOMALY_ALERTS),
          AsyncStorage.getItem(STORAGE_KEYS.FOCUS_TRACKING),
          AsyncStorage.getItem(STORAGE_KEYS.HAPTICS),
          AsyncStorage.getItem(STORAGE_KEYS.CLOUD_SYNC),
        ]);
        if (di !== null) setDailyInsights(di === 'true');
        if (aa !== null) setAnomalyAlerts(aa === 'true');
        if (ft !== null) setFocusTracking(ft === 'true');
        if (hp !== null) setHaptics(hp === 'true');
        if (cs !== null) setCloudSync(cs === 'true');
      } catch (err) {
        console.warn('[LifeLens] Failed to load preferences:', err);
      }
    }
    loadPreferences();
  }, []);

  const saveToggle = async (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch (err) {
      console.warn('[LifeLens] Failed to save setting:', err);
    }
  };

  // Load real profile and data metrics
  const loadProfileData = useCallback(async () => {
    try {
      const [currentUser, userEntries, dash] = await Promise.all([
        authApi.me().catch(() => null),
        entriesApi.list().catch(() => [] as DailyEntry[]),
        getDashboardData().catch(() => null),
      ]);
      if (currentUser) setUser(currentUser);
      if (userEntries) setEntries(userEntries);
      if (dash?.lifeScore?.overall) setLifeScore(dash.lifeScore.overall);
    } catch (err) {
      console.warn('[LifeLens] Failed to load user profile:', err);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignored
    }
    router.replace('/login');
  };

  const handleLoadDemoData = async () => {
    setActionLoading(true);
    try {
      const { success, skipped } = await seedDemoDataset();
      Alert.alert(
        'Demo Data Loaded',
        `Successfully imported ${success} days of habit telemetry (${skipped} already present). Your machine learning models, trends, and correlations are now fully unlocked!`,
        [
          {
            text: 'View Analytics',
            onPress: () => {
              loadProfileData();
              router.push('/(tabs)/analytics');
            },
          },
          { text: 'OK', onPress: () => loadProfileData() },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo data import failed.';
      Alert.alert('Import Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all daily logs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const all = await entriesApi.list();
              for (const e of all) {
                await entriesApi.delete(e.date);
              }
              Alert.alert('Data Cleared', 'All personal habit entries have been removed.');
              loadProfileData();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to clear entries.';
              Alert.alert('Error', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleExportCsv = () => {
    if (entries.length === 0) {
      Alert.alert('No Data', 'No entries to export. Log your first day or load demo data!');
      return;
    }
    const headers =
      'date,sleep_hours,sleep_quality,screen_time_hours,steps,deep_work_hours,daily_spend,mood_score';
    const rows = entries.map(
      (e) =>
        `${e.date},${e.sleep_hours},${e.sleep_quality},${e.screen_time_hours},${e.steps},${e.deep_work_hours},${e.daily_spend},${e.mood_score ?? ''}`
    );
    const csvContent = [headers, ...rows].join('\n');
    Alert.alert(
      'Export Ready',
      `Generated CSV with ${entries.length} daily logs.\n\nFirst 200 characters:\n\n${csvContent.slice(0, 200)}...`
    );
  };

  // Format member join date
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'August 2026';

  const userDisplayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'LifeLens Explorer');
  const userInitials = userDisplayName
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
          <Text style={styles.headerSubtitle}>
            Manage AI preferences, synchronization & account
          </Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitials || 'LL'}</Text>
              <View style={styles.onlineBadge} />
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{userDisplayName}</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </View>
              <Text style={styles.profileEmail}>{user?.email || 'demo@lifelens.ai'}</Text>
              <Text style={styles.profileMeta}>Member since {memberSince}</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{lifeScore.toFixed(1)}</Text>
              <Text style={styles.profileStatLabel}>Life Score</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>
                {entries.length > 0 ? `${entries.length} Days` : 'New User'}
              </Text>
              <Text style={styles.profileStatLabel}>Tracking</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.profileStatItem}>
              <Text style={[styles.profileStatValue, { color: colors.primary }]}>
                {entries.length >= 30 ? 'Top 5%' : entries.length >= 14 ? 'Top 15%' : 'Growing'}
              </Text>
              <Text style={styles.profileStatLabel}>Consistency</Text>
            </View>
          </View>
        </View>

        {/* DATA & INTELLIGENCE MANAGEMENT */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA MANAGEMENT & TESTING</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.actionRow}
              onPress={handleLoadDemoData}
              disabled={actionLoading}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(184, 255, 61, 0.15)' }]}>
                  <Ionicons name="sparkles" size={18} color={colors.primary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Load 45-Day Demo Data</Text>
                  <Text style={styles.settingDesc}>
                    Seed realistic historical telemetry to unlock all ML models
                  </Text>
                </View>
              </View>
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
              )}
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable style={styles.actionRow} onPress={handleExportCsv}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Export Historical CSV</Text>
                  <Text style={styles.settingDesc}>
                    {entries.length} daily logs available for export
                  </Text>
                </View>
              </View>
              <Ionicons name="download-outline" size={18} color={colors.textMuted} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.actionRow}
              onPress={handleClearData}
              disabled={actionLoading}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(255, 99, 109, 0.15)' }]}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingTitle, { color: colors.error }]}>Clear My Data</Text>
                  <Text style={styles.settingDesc}>
                    Remove all tracked entries and reset intelligence
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* AI & Intelligence Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>AI & INTELLIGENCE</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(184, 255, 61, 0.15)' }]}>
                  <Ionicons name="sparkles" size={18} color={colors.primary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Daily AI Synthesis</Text>
                  <Text style={styles.settingDesc}>
                    Generate predictive insight every morning
                  </Text>
                </View>
              </View>
              <Switch
                value={dailyInsights}
                onValueChange={(val) =>
                  saveToggle(STORAGE_KEYS.DAILY_INSIGHTS, val, setDailyInsights)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(255, 159, 74, 0.15)' }]}>
                  <Ionicons name="warning" size={18} color="#FF9F4A" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Anomaly Alerts</Text>
                  <Text style={styles.settingDesc}>
                    Detect irregular habits & sleep deficits
                  </Text>
                </View>
              </View>
              <Switch
                value={anomalyAlerts}
                onValueChange={(val) =>
                  saveToggle(STORAGE_KEYS.ANOMALY_ALERTS, val, setAnomalyAlerts)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(93, 169, 255, 0.15)' }]}>
                  <Ionicons name="bulb-outline" size={18} color={colors.blue} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Deep Work Optimization</Text>
                  <Text style={styles.settingDesc}>
                    Calculate optimal focus time windows
                  </Text>
                </View>
              </View>
              <Switch
                value={focusTracking}
                onValueChange={(val) =>
                  saveToggle(STORAGE_KEYS.FOCUS_TRACKING, val, setFocusTracking)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES & HARDWARE</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(66, 215, 122, 0.15)' }]}>
                  <Ionicons name="cloud-done-outline" size={18} color={colors.green} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>LifeLens Cloud Sync</Text>
                  <Text style={styles.settingDesc}>
                    Auto-sync entries to secure encrypted vault
                  </Text>
                </View>
              </View>
              <Switch
                value={cloudSync}
                onValueChange={(val) =>
                  saveToggle(STORAGE_KEYS.CLOUD_SYNC, val, setCloudSync)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="finger-print-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Haptic Feedback</Text>
                  <Text style={styles.settingDesc}>
                    Tactile response on gestures & score adjustments
                  </Text>
                </View>
              </View>
              <Switch
                value={haptics}
                onValueChange={(val) =>
                  saveToggle(STORAGE_KEYS.HAPTICS, val, setHaptics)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Sign out of LifeLens AI"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        {/* App Version Info */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>LifeLens AI Mobile • Version 1.0.0</Text>
          <Text style={styles.buildText}>Expo SDK 57 • Live API Connected</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  proBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.3)',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  profileStatsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    paddingRight: spacing.md,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 99, 109, 0.10)',
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 99, 109, 0.25)',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: 2,
  },
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  buildText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
