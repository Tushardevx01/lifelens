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
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
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
  initialSteps?: number;
  initialMode?: 'steps' | 'workout';
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

const STEP_GOAL = 10000;

export function WorkoutModal({
  visible,
  onClose,
  onSuccess,
  initialSteps = 8500,
  initialMode = 'steps',
}: WorkoutModalProps) {
  const [activeTab, setActiveTab] = useState<'steps' | 'workout'>(initialMode);

  // Step Tracking State
  const [dailySteps, setDailySteps] = useState(initialSteps);
  const [customStepInput, setCustomStepInput] = useState('');
  const [showCustomStepInput, setShowCustomStepInput] = useState(false);
  const [savingSteps, setSavingSteps] = useState(false);

  // Workout Tracker State
  const [selectedActivity, setSelectedActivity] = useState('running');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [workoutStepsOverride, setWorkoutStepsOverride] = useState<number | null>(null);
  const [intensity, setIntensity] = useState<'low' | 'moderate' | 'vigorous'>('moderate');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [consistency, setConsistency] = useState<WorkoutConsistencyResponse | null>(null);

  // Live stopwatch mode
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (visible) {
      if (initialSteps > 0) {
        setDailySteps(initialSteps);
      }
      setActiveTab(initialMode);
      telemetryApi.workouts
        .getConsistency()
        .then((data) => setConsistency(data))
        .catch(() => {});
    }
  }, [visible, initialSteps, initialMode]);

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

  const currentWorkoutSteps = workoutStepsOverride ?? estimatedSteps;

  // Step Progress & Activity Index Math
  const stepProgressPct = Math.min(100, Math.round((dailySteps / STEP_GOAL) * 100));
  const activityIndex = Math.min(dailySteps / STEP_GOAL, 1.0);

  const handleAdjustSteps = (delta: number) => {
    setDailySteps((prev) => Math.max(0, prev + delta));
  };

  const handleApplyCustomSteps = () => {
    const val = parseInt(customStepInput, 10);
    if (!isNaN(val) && val >= 0) {
      setDailySteps(val);
      setCustomStepInput('');
      setShowCustomStepInput(false);
    } else {
      Alert.alert('Invalid Steps', 'Please enter a valid non-negative number of steps.');
    }
  };

  const handleSaveDailySteps = async () => {
    setSavingSteps(true);
    try {
      await nativeActivityService.updateDailySteps(dailySteps);
      Alert.alert(
        'Daily Steps Saved',
        `Logged ${dailySteps.toLocaleString()} steps! Your Activity Index and Life Score have been updated.`,
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
      console.error('[WorkoutModal] Save steps error:', err);
      Alert.alert('Error', 'Failed to save daily step count.');
    } finally {
      setSavingSteps(false);
    }
  };

  const handleToggleStopwatch = () => {
    if (isLiveActive) {
      setIsLiveActive(false);
      setDurationMinutes(Math.max(1, Math.round(elapsedSeconds / 60)));
    } else {
      setIsLiveActive(true);
    }
  };

  const handleSubmitWorkout = async () => {
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
        steps: currentWorkoutSteps,
        intensity,
        notes: notes.trim() || undefined,
      });

      if (res.consistency) {
        setConsistency(res.consistency);
      }

      Alert.alert(
        'Workout Saved',
        `Logged ${effectiveDuration} mins of ${ACTIVITY_PROFILES[selectedActivity]?.name || selectedActivity} (${calculatedCalories} kcal, ~${currentWorkoutSteps} steps).`,
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
                <Ionicons name="footsteps" size={18} color="#557520" />
              </View>
              <View>
                <Text style={styles.title}>Movement & Step Tracker</Text>
                <Text style={styles.subtitle}>Activity index, daily step goal & workouts</Text>
              </View>
            </View>
            <IconButton
              icon="close"
              onPress={onClose}
              size={36}
              accessibilityLabel="Close movement modal"
            />
          </View>

          {/* Tab Switcher: Daily Steps vs Log Workout */}
          <View style={styles.tabSwitcher}>
            <Pressable
              style={[
                styles.tabBtn,
                activeTab === 'steps' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('steps')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'steps' }}
            >
              <Ionicons
                name="footsteps"
                size={16}
                color={activeTab === 'steps' ? '#FFFFFF' : colors.secondaryText}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'steps' && styles.tabBtnTextActive,
                ]}
              >
                Daily Steps
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabBtn,
                activeTab === 'workout' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('workout')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'workout' }}
            >
              <Ionicons
                name="fitness"
                size={16}
                color={activeTab === 'workout' ? '#FFFFFF' : colors.secondaryText}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'workout' && styles.tabBtnTextActive,
                ]}
              >
                Log Workout
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {activeTab === 'steps' ? (
              /* ============================================================== */
              /* TAB 1: DAILY STEPS TRACKER                                     */
              /* ============================================================== */
              <View style={styles.tabContent}>
                {/* Hero Step Counter Card */}
                <View style={styles.stepHeroCard}>
                  <View style={styles.stepHeroHeader}>
                    <View style={styles.stepIconBubble}>
                      <Ionicons name="walk" size={24} color="#557520" />
                    </View>
                    <View style={styles.stepHeroTitles}>
                      <Text style={styles.stepCardTitle}>Today's Steps</Text>
                      <Text style={styles.stepCardSub}>Target: {STEP_GOAL.toLocaleString()} steps/day</Text>
                    </View>
                    <ScoreBadge score={stepProgressPct} size="sm" />
                  </View>

                  <View style={styles.stepDigitsRow}>
                    <Text style={styles.stepDigits}>{dailySteps.toLocaleString()}</Text>
                    <Text style={styles.stepDigitsUnit}>steps</Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.stepProgressTrack}>
                    <View
                      style={[
                        styles.stepProgressFill,
                        { width: `${stepProgressPct}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.stepProgressSubRow}>
                    <Text style={styles.stepProgressSubText}>
                      {stepProgressPct >= 100
                        ? '🎉 Goal Reached! Optimal Activity Index achieved.'
                        : `${(STEP_GOAL - dailySteps).toLocaleString()} steps left to reach 10,000`}
                    </Text>
                    <Text style={styles.stepProgressPctText}>{stepProgressPct}%</Text>
                  </View>
                </View>

                {/* Activity Index & LifeScore Impact */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>Activity Index</Text>
                    <Text style={styles.statBoxVal}>{activityIndex.toFixed(2)} / 1.00</Text>
                    <Text style={styles.statBoxSub}>Formula: min(steps/10k, 1.0)</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>Life Score Impact</Text>
                    <Text style={styles.statBoxVal}>
                      +{Math.round(activityIndex * 15)} pts
                    </Text>
                    <Text style={styles.statBoxSub}>15% physical domain weight</Text>
                  </View>
                </View>

                {/* Quick Add Stepper Buttons */}
                <Text style={styles.sectionLabel}>QUICK STEP LOGGING</Text>
                <View style={styles.quickAddGrid}>
                  {[
                    { label: '+500', delta: 500 },
                    { label: '+1,000', delta: 1000 },
                    { label: '+2,500', delta: 2500 },
                    { label: '+5,000', delta: 5000 },
                    { label: '-500', delta: -500 },
                  ].map((btn) => (
                    <Pressable
                      key={btn.label}
                      style={({ pressed }) => [
                        styles.quickAddPill,
                        pressed && styles.quickAddPillPressed,
                      ]}
                      onPress={() => handleAdjustSteps(btn.delta)}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${btn.label} steps`}
                    >
                      <Text style={styles.quickAddPillText}>{btn.label}</Text>
                    </Pressable>
                  ))}

                  <Pressable
                    style={styles.quickAddCustomPill}
                    onPress={() => setShowCustomStepInput((prev) => !prev)}
                    accessibilityRole="button"
                    accessibilityLabel="Enter custom step count"
                  >
                    <Ionicons name="pencil" size={13} color={colors.primaryText} />
                    <Text style={styles.quickAddCustomText}>Custom</Text>
                  </Pressable>
                </View>

                {/* Custom Direct Input */}
                {showCustomStepInput && (
                  <View style={styles.customInputWrap}>
                    <TextInput
                      style={styles.customStepInput}
                      value={customStepInput}
                      onChangeText={setCustomStepInput}
                      placeholder="Enter exact steps (e.g. 7420)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      autoFocus
                    />
                    <Button
                      title="Set Steps"
                      onPress={handleApplyCustomSteps}
                      size="sm"
                      variant="primary"
                    />
                  </View>
                )}

                {/* Step Milestones Card */}
                <Text style={styles.sectionLabel}>DAILY MILESTONES</Text>
                <View style={styles.milestonesCard}>
                  <View style={styles.milestoneItem}>
                    <Ionicons
                      name={dailySteps >= 3000 ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={dailySteps >= 3000 ? '#557520' : colors.textMuted}
                    />
                    <View style={styles.milestoneTextCol}>
                      <Text style={styles.milestoneTitle}>3,000 Steps · Sedentary Break</Text>
                      <Text style={styles.milestoneSub}>Reduces cardiovascular fatigue & lifts energy</Text>
                    </View>
                  </View>

                  <View style={styles.milestoneDivider} />

                  <View style={styles.milestoneItem}>
                    <Ionicons
                      name={dailySteps >= 5000 ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={dailySteps >= 5000 ? '#557520' : colors.textMuted}
                    />
                    <View style={styles.milestoneTextCol}>
                      <Text style={styles.milestoneTitle}>5,000 Steps · Active Base</Text>
                      <Text style={styles.milestoneSub}>Baseline metabolic burn & focus enhancer</Text>
                    </View>
                  </View>

                  <View style={styles.milestoneDivider} />

                  <View style={styles.milestoneItem}>
                    <Ionicons
                      name={dailySteps >= 10000 ? 'trophy' : 'ellipse-outline'}
                      size={18}
                      color={dailySteps >= 10000 ? '#D97706' : colors.textMuted}
                    />
                    <View style={styles.milestoneTextCol}>
                      <Text style={styles.milestoneTitle}>10,000 Steps · Peak Health Goal</Text>
                      <Text style={styles.milestoneSub}>Maximizes 15-pt physical domain contribution</Text>
                    </View>
                  </View>
                </View>

                {/* Save Daily Steps Button */}
                <View style={styles.btnRow}>
                  <Button
                    title={savingSteps ? 'Saving...' : `Save Daily Steps (${dailySteps.toLocaleString()})`}
                    onPress={handleSaveDailySteps}
                    disabled={savingSteps}
                    variant="primary"
                  />
                </View>
              </View>
            ) : (
              /* ============================================================== */
              /* TAB 2: WORKOUT SESSION TRACKER                                 */
              /* ============================================================== */
              <View style={styles.tabContent}>
                {/* Behavioral Consistency Stats */}
                {consistency && (
                  <View style={styles.consistencyBanner}>
                    <View style={styles.consCol}>
                      <Text style={styles.consLabel}>Workout Streak</Text>
                      <Text style={[styles.consVal, { color: colors.darkButton }]}>
                        {consistency.streak_days ?? consistency.current_streak ?? 0} days
                      </Text>
                    </View>
                    <View style={styles.consDiv} />
                    <View style={styles.consCol}>
                      <Text style={styles.consLabel}>Rest Adherence</Text>
                      <Text style={styles.consVal}>
                        {Math.round(
                          consistency.rest_days_adherence !== undefined
                            ? consistency.rest_days_adherence <= 1
                              ? consistency.rest_days_adherence * 100
                              : consistency.rest_days_adherence
                            : consistency.rest_day_adherence_pct ?? 100
                        )}%
                      </Text>
                    </View>
                    <View style={styles.consDiv} />
                    <View style={styles.consCol}>
                      <Text style={styles.consLabel}>Skip Risk</Text>
                      {(() => {
                        const rawSkip =
                          consistency.skip_vulnerability ??
                          consistency.workout_skip_vulnerability ??
                          0;
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
                                    : '#557520',
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

                {/* Activity Discipline Grid */}
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
                          color={isSelected ? '#FFFFFF' : colors.primaryText}
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

                {/* Duration & Stopwatch */}
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
                        color={isLiveActive ? '#FFF' : colors.darkButton}
                      />
                      <Text style={[styles.stopwatchText, isLiveActive && { color: '#FFF' }]}>
                        {isLiveActive ? 'Pause Timer' : elapsedSeconds > 0 ? 'Resume Timer' : 'Live Stopwatch'}
                      </Text>
                    </Pressable>
                  </View>

                  {isLiveActive || elapsedSeconds > 0 ? (
                    <View style={styles.liveTimerWrap}>
                      <Text style={styles.liveTimerDigits}>{formatTimer(elapsedSeconds)}</Text>
                      <Text style={styles.liveTimerSub}>Active tracking in progress</Text>
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

                {/* Intensity */}
                <Text style={styles.sectionLabel}>INTENSITY LEVEL</Text>
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

                {/* MET Live Calculation */}
                <View style={styles.metCard}>
                  <View style={styles.metCol}>
                    <Text style={styles.metLabel}>Estimated Burn</Text>
                    <Text style={styles.metVal}>{calculatedCalories} kcal</Text>
                  </View>
                  <View style={styles.consDiv} />
                  <Pressable
                    style={styles.metCol}
                    onPress={() => setWorkoutStepsOverride((prev) => (prev ? prev + 500 : estimatedSteps + 500))}
                    accessibilityRole="button"
                    accessibilityLabel="Adjust workout steps"
                  >
                    <Text style={styles.metLabel}>Estimated Steps</Text>
                    <Text style={styles.metVal}>~{currentWorkoutSteps}</Text>
                  </Pressable>
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

                {/* Submit Workout */}
                <View style={styles.btnRow}>
                  <Button
                    title={loading ? 'Recording...' : `Log ${effectiveDuration}m Workout (~${currentWorkoutSteps} steps)`}
                    onPress={handleSubmitWorkout}
                    disabled={loading}
                    variant="primary"
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(36, 36, 36, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    maxHeight: '92%',
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fitnessIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDF5DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.primaryText,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.secondaryText,
    fontSize: 12,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.full,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  tabBtnActive: {
    backgroundColor: colors.darkButton,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  tabContent: {
    paddingBottom: spacing.lg,
  },
  // Steps Tab Styles
  stepHeroCard: {
    backgroundColor: '#EDF5DC',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#DCE9B5',
  },
  stepHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepHeroTitles: {
    flex: 1,
  },
  stepCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryText,
  },
  stepCardSub: {
    fontSize: 12,
    color: '#557520',
    marginTop: 2,
    fontWeight: '600',
  },
  stepDigitsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: spacing.sm,
  },
  stepDigits: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.5,
  },
  stepDigitsUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  stepProgressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  stepProgressFill: {
    height: '100%',
    backgroundColor: '#789938',
    borderRadius: 5,
  },
  stepProgressSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  stepProgressSubText: {
    fontSize: 12,
    color: '#49631B',
    fontWeight: '600',
    flex: 1,
  },
  stepProgressPctText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#49631B',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    marginBottom: 4,
  },
  statBoxVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryText,
    marginBottom: 2,
  },
  statBoxSub: {
    fontSize: 10,
    color: colors.secondaryText,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  quickAddPill: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAddPillPressed: {
    backgroundColor: '#FFEAE0',
    borderColor: colors.primary,
  },
  quickAddPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  quickAddCustomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAddCustomText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customStepInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.primaryText,
  },
  milestonesCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  milestoneTextCol: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  milestoneSub: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2,
  },
  milestoneDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  // Workout Tab Styles
  consistencyBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.secondaryText,
    marginBottom: 2,
    fontWeight: '600',
  },
  consVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryText,
  },
  sectionLabel: {
    color: colors.secondaryText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
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
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actPillSelected: {
    backgroundColor: colors.darkButton,
    borderColor: colors.darkButton,
  },
  actLabel: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  actLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  durationCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  durationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  stopwatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEAE0',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  stopwatchBtnActive: {
    backgroundColor: '#FF5A5F',
  },
  stopwatchText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.darkButton,
  },
  liveTimerWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  liveTimerDigits: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.primaryText,
    fontVariant: ['tabular-nums'],
  },
  liveTimerSub: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 4,
  },
  manualDurationWrap: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  minsPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  minsPillSelected: {
    backgroundColor: colors.darkButton,
    borderColor: colors.darkButton,
  },
  minsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  minsTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  intensityPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intensityPillSelected: {
    backgroundColor: colors.darkButton,
    borderColor: colors.darkButton,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  intensityTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  metCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metCol: {
    flex: 1,
    alignItems: 'center',
  },
  metLabel: {
    fontSize: 10,
    color: colors.secondaryText,
    marginBottom: 2,
    fontWeight: '600',
  },
  metVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryText,
  },
  notesInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 13,
    color: colors.primaryText,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  btnRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
});
