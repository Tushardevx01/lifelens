import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { IconButton, Button } from '@/src/components/ui';
import {
  nativeScreenTracker,
  computeDistractionIndex,
  isLateNightHour,
  DISTRACTING_CATEGORIES,
  PRODUCTIVE_CATEGORIES,
  type NativeScreenState,
} from '@/src/services/nativeScreenTracker';
import { telemetryApi } from '@/src/services/api';
import type { AppUsageSummary } from '@/src/types/api.types';

interface ScreenTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_APPS: readonly { name: string; category: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'Instagram', category: 'Social Media', icon: 'logo-instagram' },
  { name: 'YouTube', category: 'Entertainment', icon: 'logo-youtube' },
  { name: 'Slack', category: 'Productivity', icon: 'chatbubbles-outline' },
  { name: 'VS Code', category: 'Productivity', icon: 'code-slash' },
  { name: 'Reddit', category: 'Social Media', icon: 'globe-outline' },
  { name: 'Netflix', category: 'Entertainment', icon: 'film-outline' },
  { name: 'Notion', category: 'Productivity', icon: 'document-text-outline' },
  { name: 'WhatsApp', category: 'Communication', icon: 'chatbubble-ellipses-outline' },
];

const CATEGORIES = [
  'Social Media',
  'Entertainment',
  'Productivity',
  'Gaming',
  'Utilities',
  'Communication',
];

export function ScreenTimeModal({ visible, onClose, onSuccess }: ScreenTimeModalProps) {
  const [screenState, setScreenState] = useState<NativeScreenState | null>(null);
  const [summary, setSummary] = useState<AppUsageSummary | null>(null);

  // Form state
  const [appName, setAppName] = useState('Instagram');
  const [appCategory, setAppCategory] = useState('Social Media');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [customAppName, setCustomAppName] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto late night detection
  const isLateNow = useMemo(() => isLateNightHour(new Date()), []);

  const refreshData = async () => {
    try {
      const state = await nativeScreenTracker.getTodayState();
      setScreenState(state);

      const sum = await telemetryApi.appUsage.getSummary();
      setSummary(sum);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (visible) {
      refreshData();
    }
  }, [visible]);

  const handleSelectPreset = (preset: typeof PRESET_APPS[0]) => {
    setAppName(preset.name);
    setAppCategory(preset.category);
    setCustomAppName('');
  };

  const distractionIndex = useMemo(() => {
    if (summary?.distraction_index !== undefined) {
      return summary.distraction_index;
    }
    if (!screenState) return 0.0;
    let dist = 0;
    let prod = 0;
    for (const s of screenState.sessions) {
      if (DISTRACTING_CATEGORIES.has(s.appCategory)) dist += s.durationMinutes;
      if (PRODUCTIVE_CATEGORIES.has(s.appCategory)) prod += s.durationMinutes;
    }
    return computeDistractionIndex(dist, prod);
  }, [summary, screenState]);

  const totalScreenHours = useMemo(() => {
    if (summary?.total_hours !== undefined) return summary.total_hours;
    if (!screenState) return 0.0;
    return Math.round((screenState.totalScreenMinutes / 60) * 10) / 10;
  }, [summary, screenState]);

  const unlockCount = useMemo(() => {
    return screenState?.unlockCount || 0;
  }, [screenState]);

  const handleSubmitSession = async () => {
    const finalName = customAppName.trim() || appName;
    if (!finalName) {
      Alert.alert('App Name Missing', 'Please select or enter an app name.');
      return;
    }

    if (durationMinutes <= 0) {
      Alert.alert('Invalid Duration', 'Duration must be at least 1 minute.');
      return;
    }

    setLoading(true);
    try {
      await nativeScreenTracker.recordAppSession({
        appName: finalName,
        appCategory,
        durationMinutes,
      });

      await refreshData();

      Alert.alert(
        'Session Logged',
        `Logged ${durationMinutes}m on ${finalName} (${appCategory}).${isLateNow ? ' 🌙 Tagged as Late-Night (22:00–05:59).' : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess?.();
            },
          },
        ]
      );
    } catch (err) {
      console.error('[ScreenTimeModal] Error logging session:', err);
      Alert.alert('Error', 'Failed to log app usage session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.screenIcon}>
                <Ionicons name="phone-portrait-outline" size={18} color="#4A9EFF" />
              </View>
              <View>
                <Text style={styles.title}>Digital Habits & Screen Tracker</Text>
                <Text style={styles.subtitle}>Native unlocks, app sessions & distraction index</Text>
              </View>
            </View>
            <IconButton
              icon="close"
              onPress={onClose}
              size={36}
              accessibilityLabel="Close screen tracker modal"
            />
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Daily Aggregate Dashboard */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Screen</Text>
                <Text style={styles.metricVal}>{totalScreenHours}h</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Device Unlocks</Text>
                <Text style={styles.metricVal}>{unlockCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Distraction Index</Text>
                <Text
                  style={[
                    styles.metricVal,
                    {
                      color:
                        distractionIndex > 0.6
                          ? '#FF5A5F'
                          : distractionIndex > 0.3
                          ? '#FF9F43'
                          : '#00D4AA',
                    },
                  ]}
                >
                  {Math.round(distractionIndex * 100)}%
                </Text>
              </View>
            </View>

            {/* Late Night Notice */}
            {isLateNow && (
              <View style={styles.lateNightBanner}>
                <Ionicons name="moon-outline" size={16} color="#FF9F43" />
                <Text style={styles.lateNightText}>
                  Late-Night Active Window (22:00–05:59). Sessions logged now are automatically tagged to assess sleep disruption risk.
                </Text>
              </View>
            )}

            {/* App Presets */}
            <Text style={styles.sectionLabel}>FREQUENT APPLICATIONS</Text>
            <View style={styles.presetsGrid}>
              {PRESET_APPS.map((p) => {
                const isSel = appName === p.name && !customAppName;
                return (
                  <Pressable
                    key={p.name}
                    onPress={() => handleSelectPreset(p)}
                    style={[
                      styles.presetPill,
                      isSel && styles.presetPillSelected,
                    ]}
                  >
                    <Ionicons
                      name={p.icon}
                      size={14}
                      color={isSel ? colors.background : colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.presetText,
                        isSel && styles.presetTextSelected,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom App Name */}
            <Text style={styles.sectionLabel}>OR CUSTOM APP</Text>
            <TextInput
              style={styles.inputField}
              value={customAppName}
              onChangeText={(text) => {
                setCustomAppName(text);
                if (text.trim()) setAppName(text.trim());
              }}
              placeholder="e.g. Duolingo, Kindle, TikTok, Figma..."
              placeholderTextColor={colors.textMuted}
            />

            {/* Category Selector */}
            <Text style={styles.sectionLabel}>APPLICATION CATEGORY</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const isSel = appCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setAppCategory(cat)}
                    style={[
                      styles.categoryPill,
                      isSel && styles.categoryPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isSel && styles.categoryTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Session Duration */}
            <Text style={styles.sectionLabel}>SESSION DURATION (MINUTES)</Text>
            <View style={styles.durationOptions}>
              {[10, 15, 25, 45, 60].map((mins) => (
                <Pressable
                  key={mins}
                  onPress={() => setDurationMinutes(mins)}
                  style={[
                    styles.durPill,
                    durationMinutes === mins && styles.durPillSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.durText,
                      durationMinutes === mins && styles.durTextSelected,
                    ]}
                  >
                    {mins}m
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Recent Sessions */}
            {screenState && screenState.sessions.length > 0 && (
              <View style={styles.recentWrap}>
                <Text style={styles.sectionLabel}>SESSIONS LOGGED TODAY</Text>
                {screenState.sessions.slice(-4).reverse().map((s, idx) => (
                  <View key={idx} style={styles.sessionItem}>
                    <View style={styles.sessionMain}>
                      <Text style={styles.sessionName}>{s.appName}</Text>
                      <Text style={styles.sessionCat}>{s.appCategory}</Text>
                    </View>
                    <View style={styles.sessionRight}>
                      <Text style={styles.sessionDur}>{s.durationMinutes} mins</Text>
                      {s.isLateNight && (
                        <Text style={styles.sessionLate}>🌙 Late-Night</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Submit */}
            <View style={styles.btnRow}>
              <Button
                title={loading ? 'Logging...' : `Record ${durationMinutes}m App Session`}
                onPress={handleSubmitSession}
                disabled={loading}
                variant="primary"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  screenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lateNightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 159, 67, 0.12)',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.3)',
    marginBottom: spacing.md,
  },
  lateNightText: {
    flex: 1,
    color: '#FF9F43',
    fontSize: 11,
    lineHeight: 15,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPillSelected: {
    backgroundColor: '#4A9EFF',
    borderColor: '#4A9EFF',
  },
  presetText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  presetTextSelected: {
    color: colors.background,
    fontWeight: '700',
  },
  inputField: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(93, 169, 255, 0.15)',
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  durationOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  durPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  durPillSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(93, 169, 255, 0.15)',
  },
  durText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  durTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  recentWrap: {
    marginBottom: spacing.md,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  sessionMain: {},
  sessionName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  sessionCat: {
    color: colors.textMuted,
    fontSize: 11,
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  sessionDur: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  sessionLate: {
    color: '#FF9F43',
    fontSize: 10,
    fontWeight: '600',
  },
  btnRow: {
    marginBottom: spacing.xl,
  },
});
