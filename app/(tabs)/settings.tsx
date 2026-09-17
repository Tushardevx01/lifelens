import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  // Settings state toggles
  const [dailyInsights, setDailyInsights] = useState(true);
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);
  const [focusTracking, setFocusTracking] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [cloudSync, setCloudSync] = useState(true);

  const handleLogout = () => {
    router.replace('/login');
  };

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
              <Text style={styles.avatarText}>AM</Text>
              <View style={styles.onlineBadge} />
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>Alex Morgan</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </View>
              <Text style={styles.profileEmail}>demo@lifelens.ai</Text>
              <Text style={styles.profileMeta}>Member since August 2026</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>84.5</Text>
              <Text style={styles.profileStatLabel}>Life Score</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>28 Days</Text>
              <Text style={styles.profileStatLabel}>Tracking</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.profileStatItem}>
              <Text style={[styles.profileStatValue, { color: colors.primary }]}>
                Top 5%
              </Text>
              <Text style={styles.profileStatLabel}>Consistency</Text>
            </View>
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
                onValueChange={setDailyInsights}
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
                onValueChange={setAnomalyAlerts}
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
                onValueChange={setFocusTracking}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Data & Connected Integrations */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA & INTEGRATIONS</Text>
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
                onValueChange={setCloudSync}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.rowDivider} />

            <Pressable style={styles.actionRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="fitness-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Health & Wearables</Text>
                  <Text style={styles.settingDesc}>
                    Connected • 8,900 steps synced today
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable style={styles.actionRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Import Historical CSV</Text>
                  <Text style={styles.settingDesc}>
                    Bulk import life logs via CSV file
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <View style={styles.card}>
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
                onValueChange={setHaptics}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.actionRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="color-palette-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Theme Mode</Text>
                  <Text style={styles.settingDesc}>
                    Dark Neon (LifeLens Signature)
                  </Text>
                </View>
              </View>
              <View style={styles.activeThemeBadge}>
                <Text style={styles.activeThemeText}>Default</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ABOUT & SECURITY</Text>
          <View style={styles.card}>
            <Pressable style={styles.actionRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.textPrimary} />
                </View>
                <Text style={styles.settingTitle}>Privacy & Data Protection</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable style={styles.actionRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.textPrimary} />
                </View>
                <Text style={styles.settingTitle}>System Health & API Status</Text>
              </View>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Live</Text>
              </View>
            </Pressable>
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
          <Text style={styles.buildText}>Expo Go Compatible • SDK 57</Text>
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
  activeThemeBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeThemeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(66, 215, 122, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.green,
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
