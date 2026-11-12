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
import { authApi, entriesApi, getDashboardData, offlineSyncService } from '@/src/services/api';
import type { User, DailyEntry } from '@/src/types/api.types';
import { seedDemoDataset } from '@/src/features/dashboard/demoData';
import { ConnectorsHubModal } from '@/src/components/connectors/ConnectorsHubModal';

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
  const [lifeScore, setLifeScore] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [connectorsModalVisible, setConnectorsModalVisible] = useState(false);

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
      let userEntries: DailyEntry[] = [];
      let listSuccess = false;

      const [currentUser, dash] = await Promise.all([
        authApi.me().catch(() => null),
        getDashboardData().catch(() => null),
      ]);

      try {
        userEntries = await entriesApi.listAll();
        listSuccess = true;
      } catch {
        listSuccess = false;
      }

      if (currentUser) setUser(currentUser);
      if (listSuccess) {
        setEntries(userEntries || []);
      } else {
        setEntries([]);
      }
      if (typeof dash?.lifeScore?.overall === 'number') setLifeScore(dash.lifeScore.overall);
    } catch (err) {
      console.warn('[LifeLens] Failed to load user profile:', err);
      setEntries([]);
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
    // Do not leave another account's queued mutations on the device.
    await offlineSyncService.clearAll().catch(() => {});
    router.replace('/login');
  };

  const handleLoadDemoData = async () => {
    setActionLoading(true);
    try {
      let success = 0;
      let skipped = 0;
      const res = await seedDemoDataset();
      success = res.success;
      skipped = res.skipped;
      Alert.alert(
        'Demo Data Loaded',
        `Successfully loaded ${success} days of habit telemetry (${skipped} duplicates skipped). Your machine learning models, trends, and correlations are now fully unlocked!`,
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
              const all = await entriesApi.listAll();
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
    : '—';

  const userDisplayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'LifeLens Explorer');
  const userInitials = (userDisplayName || 'LE')
    .split(' ')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
              <Text style={styles.profileEmail}>{user?.email || 'Not signed in'}</Text>
              <Text style={styles.profileMeta}>Member since {memberSince}</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{lifeScore !== null ? lifeScore.toFixed(1) : '—'}</Text>
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
              <Text style={[styles.profileStatValue, { color: '#C05621' }]}>
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
              accessibilityRole="button"
              accessibilityLabel="Load 45-day demo data"
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: '#FFEAE0' }]}>
                  <Ionicons name="sparkles" size={18} color="#66300C" />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Load 45-Day Demo Data</Text>
                  <Text style={styles.settingDesc}>
                    Seed realistic historical telemetry to unlock all ML models
                  </Text>
                </View>
              </View>
              {actionLoading ? (
                <ActivityIndicator size="small" color="#66300C" />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color="#66300C" />
              )}
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.actionRow}
              onPress={handleExportCsv}
              accessibilityRole="button"
              accessibilityLabel="Export historical entries as CSV"
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primaryText} />
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
              accessibilityRole="button"
              accessibilityLabel="Clear all personal data"
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: '#FDE8E8' }]}>
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

        {/* Automated Data Connectors */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA SOURCES & CONNECTORS</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.actionRow}
              onPress={() => setConnectorsModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Open automated data connectors hub"
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: '#EFF5FA' }]}>
                  <Ionicons name="hardware-chip" size={18} color="#2563EB" />
                </View>
                <View style={styles.settingTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.settingTitle}>Automated Device Connectors</Text>
                    <View style={{ backgroundColor: '#F5ECE6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#66300C' }}>AUTO-SYNC</Text>
                    </View>
                  </View>
                  <Text style={styles.settingDesc}>
                    Apple Health, Google Health Connect, Screen Time & On-Device SMS Parser
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
                <View style={[styles.settingIconWrap, { backgroundColor: '#F3EDF9' }]}>
                  <Ionicons name="sparkles" size={18} color="#7C3AED" />
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
                trackColor={{ false: colors.border, true: colors.darkButton }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: '#FCF6E5' }]}>
                  <Ionicons name="warning" size={18} color="#D97706" />
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
                trackColor={{ false: colors.border, true: colors.darkButton }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: '#EFF5FA' }]}>
                  <Ionicons name="bulb-outline" size={18} color="#2563EB" />
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
                trackColor={{ false: colors.border, true: colors.darkButton }}
                thumbColor="#FFFFFF"
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
                <View style={[styles.settingIconWrap, { backgroundColor: '#EDF5DC' }]}>
                  <Ionicons name="cloud-done-outline" size={18} color="#15803D" />
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
                trackColor={{ false: colors.border, true: colors.darkButton }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="finger-print-outline" size={18} color={colors.primaryText} />
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
                trackColor={{ false: colors.border, true: colors.darkButton }}
                thumbColor="#FFFFFF"
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
          <Text style={styles.buildText}>Expo SDK 58 • Live API Connected</Text>
        </View>
      </ScrollView>

      <ConnectorsHubModal
        visible={connectorsModalVisible}
        onClose={() => setConnectorsModalVisible(false)}
        onSyncComplete={loadProfileData}
      />
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
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryText,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: '#FFEAE0',
    borderWidth: 2,
    borderColor: '#F8D2BD',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#66300C',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#16A34A',
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
    fontWeight: '800',
    color: colors.primaryText,
  },
  proBadge: {
    backgroundColor: '#F5ECE6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#66300C',
  },
  profileEmail: {
    fontSize: 13,
    color: colors.secondaryText,
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
    fontWeight: '800',
    color: colors.primaryText,
  },
  profileStatLabel: {
    fontSize: 11,
    color: colors.secondaryText,
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
    fontWeight: '800',
    color: colors.secondaryText,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.secondaryText,
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
    backgroundColor: '#FDE8E8',
    borderRadius: radius.full,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
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
