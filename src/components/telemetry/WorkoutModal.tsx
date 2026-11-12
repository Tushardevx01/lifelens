import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  nativeActivityService,
  ACTIVITY_PROFILES,
  calculateMetCalories,
  estimateActivitySteps,
} from '@/src/services/nativeActivityService';
import { telemetryApi } from '@/src/services/api';
import type { WorkoutConsistencyResponse } from '@/src/types/api.types';

interface WorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ACTIVITIES: readonly { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'running', label: 'Running', icon: 'walk' },
  { id: 'walking', label: 'Walking', icon: 'footsteps' },
  { id: 'cycling', label: 'Cycling', icon: 'bicycle' },
  { id: 'hiit', label: 'HIIT', icon: 'flame' },
  { id: 'strength', label: 'Strength', icon: 'barbell' },
  { id: 'yoga', label: 'Yoga', icon: 'body' },
  { id: 'swimming', label: 'Swimming', icon: 'water' },
  { id: 'sports', label: 'Sports', icon: 'football' },
];

export function WorkoutModal({ visible, onClose, onSuccess }: WorkoutModalProps) {
  const [selectedActivity, setSelectedActivity] = useState('running');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [intensity, setIntensity] = useState<'low' | 'moderate' | 'vigorous'>('moderate');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [consistency, setConsistency] = useState<WorkoutConsistencyResponse | null>(null);

  // Live stopwatch mode
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load consistency stats when modal opens
  useEffect(() => {
    if (visible) {
      telemetryApi.workouts
        .getConsistency()
        .then((data) => setConsistency(data))
        .catch(() => {});
    }
  }, [visible]);

  useEffect(() => {
    if (isLiveActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLiveActive]);

  const effectiveDuration = useMemo(() => {
    if (isLiveActive || elapsedSeconds > 0) {
      return Math.max(1, Math.round(elapsedSeconds / 60));
    }
    return durationMinutes;
  }, [isLiveActive, elapsedSeconds, durationMinutes]);

  const calculatedCalories = useMemo(() => {
    let base = calculateMetCalories(selectedActivity, effectiveDuration);
    if (intensity === 'vigorous') base = Math.round(base * 1.25);
    if (intensity === 'low') base = Math.round(base * 0.85);
    return base;
  }, [selectedActivity, effectiveDuration, intensity]);

  const estimatedSteps = useMemo(() => {
    return estimateActivitySteps(selectedActivity, effectiveDuration);
  }, [selectedActivity, effectiveDuration]);

  const handleToggleStopwatch = () => {
    if (isLiveActive) {
      setIsLiveActive(false);
      setDurationMinutes(Math.max(1, Math.round(elapsedSeconds / 60)));
    } else {
      setIsLiveActive(true);
    }
  };

  const handleSubmit = async () => {
    if (effectiveDuration <= 0) {
      Alert.alert('Invalid Duration', 'Workout duration must be at least 1 minute.');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getTime() - effectiveDuration * 60000);

      const res = await nativeActivityService.recordNativeWorkout({
        activityType: selectedActivity,
        startTime: start.toISOString(),
        endTime: now.toISOString(),
        durationMinutes: effectiveDuration,
        caloriesBurned: calculatedCalories,
        intensity,
        notes: notes.trim() || undefined,
      });

      if (res.consistency) {
        setConsistency(res.consistency);
      }

      Alert.alert(
        'Workout Saved',
        `Logged ${effectiveDuration} mins of ${ACTIVITY_PROFILES[selectedActivity]?.name || selectedActivity} (${calculatedCalories} kcal, ~${estimatedSteps} steps).`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              onSuccess?.();
            },
          },
        ]
      );
    } catch (err) {
      console.error('[WorkoutModal] Error:', err);
      Alert.alert('Error', 'Failed to save workout session.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
              <View style={styles.fitnessIcon}>
                <Ionicons name="fitness" size={18} color="#B8FF00" />
              </View>
              <View>
                <Text style={styles.title}>Native Workout Tracker</Text>
                <Text style={styles.subtitle}>Active calories, steps & skip vulnerability</Text>
              </View>
            </View>
            <IconButton
              icon="close"
              onPress={onClose}
              size={36}
              accessibilityLabel="Close workout modal"
            />
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Behavioral Consistency Stats */}
            {consistency && (
              <View style={styles.consistencyBanner}>
                <View style={styles.consCol}>
                  <Text style={styles.consLabel}>Workout Streak</Text>
                  <Text style={[styles.consVal, { color: '#B8FF00' }]}>
                    {consistency.streak_days ?? consistency.current_streak ?? 0} days
                  </Text>
                </View>
                <View style={styles.consDiv} />
                <View style={styles.consCol}>
                  <Text style={styles.consLabel}>Rest-Day Adherence</Text>
                  <Text style={styles.consVal}>
                    {Math.round(
                      consistency.rest_days_adherence !== undefined
                        ? (consistency.rest_days_adherence <= 1 ? consistency.rest_days_adherence * 100 : consistency.rest_days_adherence)
                        : (consistency.rest_day_adherence_pct ?? 100)
                    )}%
                  </Text>
                </View>
                <View style={styles.consDiv} />
                <View style={styles.consCol}>
                  <Text style={styles.consLabel}>Skip Vulnerability</Text>
                  {(() => {
                    const rawSkip = consistency.skip_vulnerability ?? consistency.workout_skip_vulnerability ?? 0;
                    const skipRatio = rawSkip > 1 ? rawSkip / 100 : rawSkip;
                    return (
                      <Text
                        style={[
                          styles.consVal,
                          {
                            color:
                              skipRatio > 0.6
                                ? '#FF5A5F'
                                : skipRatio > 0.3
                                ? '#FF9F43'
                                : '#00D4AA',
                          },
                        ]}
                      >
                        {Math.round(skipRatio * 100)}%
                      </Text>
                    );
                  })()}
                </View>
              </View>
            )}

            {/* Activity Type Selector */}
            <Text style={styles.sectionLabel}>ACTIVITY DISCIPLINE</Text>
            <View style={styles.activityGrid}>
              {ACTIVITIES.map((act) => {
                const isSelected = act.id === selectedActivity;
                return (
                  <Pressable
                    key={act.id}
                    onPress={() => setSelectedActivity(act.id)}
                    style={[
                      styles.actPill,
                      isSelected && styles.actPillSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={act.label}
                  >
                    <Ionicons
                      name={act.icon}
                      size={16}
                      color={isSelected ? colors.background : colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.actLabel,
                        isSelected && styles.actLabelSelected,
                      ]}
                    >
                      {act.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Stopwatch vs Manual Duration */}
            <View style={styles.durationCard}>
              <View style={styles.timerHeader}>
                <Text style={styles.durationTitle}>Workout Duration</Text>
                <Pressable
                  onPress={handleToggleStopwatch}
                  style={[
                    styles.stopwatchBtn,
                    isLiveActive && styles.stopwatchBtnActive,
                  ]}
                >
                  <Ionicons
                    name={isLiveActive ? 'pause' : 'play'}
                    size={14}
                    color={isLiveActive ? '#FFF' : '#B8FF00'}
                  />
                  <Text style={[styles.stopwatchText, isLiveActive && { color: '#FFF' }]}>
                    {isLiveActive ? 'Pause Timer' : elapsedSeconds > 0 ? 'Resume Timer' : 'Live Stopwatch'}
                  </Text>
                </Pressable>
              </View>

              {isLiveActive || elapsedSeconds > 0 ? (
                <View style={styles.liveTimerWrap}>
                  <Text style={styles.liveTimerDigits}>{formatTimer(elapsedSeconds)}</Text>
                  <Text style={styles.liveTimerSub}>
                    Active workout tracking in progress
                  </Text>
                </View>
              ) : (
                <View style={styles.manualDurationWrap}>
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <Pressable
                      key={mins}
                      onPress={() => setDurationMinutes(mins)}
                      style={[
                        styles.minsPill,
                        durationMinutes === mins && styles.minsPillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.minsText,
                          durationMinutes === mins && styles.minsTextSelected,
                        ]}
                      >
                        {mins}m
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Intensity Level */}
            <Text style={styles.sectionLabel}>INTENSITY</Text>
            <View style={styles.intensityRow}>
              {(['low', 'moderate', 'vigorous'] as const).map((lvl) => {
                const isSel = intensity === lvl;
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => setIntensity(lvl)}
                    style={[
                      styles.intensityPill,
                      isSel && styles.intensityPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.intensityText,
                        isSel && styles.intensityTextSelected,
                      ]}
                    >
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Live MET Feedback Card */}
            <View style={styles.metCard}>
              <View style={styles.metCol}>
                <Text style={styles.metLabel}>Estimated Burn</Text>
                <Text style={styles.metVal}>{calculatedCalories} kcal</Text>
              </View>
              <View style={styles.consDiv} />
              <View style={styles.metCol}>
                <Text style={styles.metLabel}>Estimated Steps</Text>
                <Text style={styles.metVal}>~{estimatedSteps}</Text>
              </View>
              <View style={styles.consDiv} />
              <View style={styles.metCol}>
                <Text style={styles.metLabel}>Intensity MET</Text>
                <Text style={styles.metVal}>
                  {ACTIVITY_PROFILES[selectedActivity]?.met || 5.0}x
                </Text>
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.sectionLabel}>SESSION NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Pace, sets, reps, heart rate zones, or feelings..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
            />

            {/* Submit */}
            <View style={styles.btnRow}>
              <Button
                title={loading ? 'Recording...' : `Log ${effectiveDuration}m Workout`}
                onPress={handleSubmit}
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
  fitnessIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(184, 255, 61, 0.15)',
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
  consistencyBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  consCol: {
    flex: 1,
    alignItems: 'center',
  },
  consDiv: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  consLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  consVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  actPill: {
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
  actPillSelected: {
    backgroundColor: '#B8FF00',
    borderColor: '#B8FF00',
  },
  actLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  actLabelSelected: {
    color: colors.background,
    fontWeight: '700',
  },
  durationCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  durationTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  stopwatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#B8FF00',
  },
  stopwatchBtnActive: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  stopwatchText: {
    color: '#B8FF00',
    fontSize: 11,
    fontWeight: '600',
  },
  liveTimerWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  liveTimerDigits: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  liveTimerSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  manualDurationWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  minsPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  minsPillSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(93, 169, 255, 0.15)',
  },
  minsText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  minsTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  intensityPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  intensityPillSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(93, 169, 255, 0.15)',
  },
  intensityText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  intensityTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  metCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(184, 255, 61, 0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.2)',
  },
  metCol: {
    flex: 1,
    alignItems: 'center',
  },
  metLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notesInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 13,
    padding: spacing.md,
    marginBottom: spacing.lg,
    minHeight: 50,
  },
  btnRow: {
    marginBottom: spacing.xl,
  },
});
