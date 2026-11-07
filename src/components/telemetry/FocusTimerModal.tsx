import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { telemetryApi } from '@/src/services/api';
import { StarRating } from '@/src/components/entry/StarRating';

interface FocusTimerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TimerState = 'idle' | 'running' | 'paused' | 'review';

export function FocusTimerModal({ visible, onClose, onSuccess }: FocusTimerModalProps) {
  const [taskName, setTaskName] = useState('');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [focusRating, setFocusRating] = useState(4);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerState === 'running') {
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
  }, [timerState]);

  const handleStart = () => {
    if (!taskName.trim()) {
      Alert.alert('Task Name Required', 'Please specify what subject or task you are focusing on.');
      return;
    }
    setStartTime(new Date());
    setTimerState('running');
  };

  const handlePause = () => {
    setTimerState('paused');
  };

  const handleResume = () => {
    setTimerState('running');
  };

  const handleFinish = () => {
    if (elapsedSeconds < 30) {
      Alert.alert(
        'Session Too Short',
        'Sessions under 30 seconds are not saved. Do you want to cancel?',
        [
          { text: 'Keep Going', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: handleResetAndClose },
        ]
      );
      return;
    }
    setTimerState('review');
  };

  const handleResetAndClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerState('idle');
    setElapsedSeconds(0);
    setDistractionCount(0);
    setTaskName('');
    setNotes('');
    setStartTime(null);
    onClose();
  };

  const handleSaveSession = async () => {
    if (!startTime) return;
    const endTime = new Date();
    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));

    try {
      setLoading(true);
      await telemetryApi.focusSessions.create({
        subject_or_task: taskName.trim(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMins,
        self_reported_focus: focusRating,
        distraction_count: distractionCount,
        notes: notes.trim() || null,
      });

      handleResetAndClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save focus session.';
      Alert.alert('Save Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleResetAndClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleResetAndClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Deep Work Timer</Text>
              <Text style={styles.subtitle}>Track focus quality & study sessions</Text>
            </View>
            <Pressable onPress={handleResetAndClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Active Timer Mode */}
          {timerState !== 'review' ? (
            <View style={styles.timerBody}>
              {timerState === 'idle' ? (
                <View style={styles.taskInputGroup}>
                  <Text style={styles.label}>Focus Task or Subject</Text>
                  <TextInput
                    style={styles.taskInput}
                    value={taskName}
                    onChangeText={setTaskName}
                    placeholder="e.g. Calculus PSet, System Architecture"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                  />
                </View>
              ) : (
                <View style={styles.activeTaskBadge}>
                  <Ionicons name="flash" size={16} color={colors.primary} />
                  <Text style={styles.activeTaskText} numberOfLines={1}>
                    {taskName}
                  </Text>
                </View>
              )}

              {/* Digital Timer */}
              <View style={styles.timerCircle}>
                <Text style={styles.timerDigits}>{formatTime(elapsedSeconds)}</Text>
                <Text style={styles.timerSub}>
                  {timerState === 'running'
                    ? 'In Flow'
                    : timerState === 'paused'
                    ? 'Paused'
                    : 'Ready'}
                </Text>
              </View>

              {/* Distraction Incrementer (During Run) */}
              {timerState !== 'idle' && (
                <View style={styles.distractionSection}>
                  <Pressable
                    style={styles.distractionButton}
                    onPress={() => setDistractionCount((prev) => prev + 1)}
                  >
                    <Ionicons name="alert-circle-outline" size={18} color={colors.orange} />
                    <Text style={styles.distractionButtonText}>
                      Log Interruption ({distractionCount})
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Timer Controls */}
              <View style={styles.controlsRow}>
                {timerState === 'idle' ? (
                  <Pressable style={styles.primaryActionButton} onPress={handleStart}>
                    <Ionicons name="play" size={22} color={colors.background} />
                    <Text style={styles.primaryActionText}>Start Focus Session</Text>
                  </Pressable>
                ) : (
                  <>
                    {timerState === 'running' ? (
                      <Pressable style={styles.pauseButton} onPress={handlePause}>
                        <Ionicons name="pause" size={20} color={colors.textPrimary} />
                        <Text style={styles.pauseText}>Pause</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={styles.resumeButton} onPress={handleResume}>
                        <Ionicons name="play" size={20} color={colors.background} />
                        <Text style={styles.resumeText}>Resume</Text>
                      </Pressable>
                    )}

                    <Pressable style={styles.finishButton} onPress={handleFinish}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      <Text style={styles.finishText}>End Session</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ) : (
            /* Review & Rating Mode */
            <View style={styles.reviewBody}>
              <View style={styles.reviewSummaryCard}>
                <Text style={styles.reviewTitle}>Session Completed!</Text>
                <Text style={styles.reviewDuration}>
                  {Math.max(1, Math.round(elapsedSeconds / 60))} Minutes of Focus
                </Text>
                <Text style={styles.reviewMeta}>
                  {distractionCount === 0
                    ? 'Zero interruptions — pristine focus flow.'
                    : `${distractionCount} interruption${distractionCount > 1 ? 's' : ''} logged.`}
                </Text>
              </View>

              {/* Star Rating */}
              <View style={styles.fieldGroup}>
                <StarRating
                  label="Concentration Quality"
                  value={focusRating}
                  onChange={setFocusRating}
                  labels={{
                    1: '1/5 Extremely Distracted',
                    2: '2/5 Frequent Interruptions',
                    3: '3/5 Moderate Focus',
                    4: '4/5 Strong Deep Flow',
                    5: '5/5 Exceptional Mastery',
                  }}
                />
              </View>

              {/* Reflection Notes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Reflection Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Key concepts mastered or what caused distractions?"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>

              {/* Submit Review */}
              <Pressable
                style={[styles.primaryActionButton, loading && { opacity: 0.6 }]}
                onPress={handleSaveSession}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.primaryActionText}>Save to Analytics</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timerBody: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  taskInputGroup: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  taskInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  activeTaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 255, 61, 0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  activeTaskText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.xs,
    maxWidth: 220,
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(184, 255, 61, 0.03)',
    marginBottom: spacing.lg,
  },
  timerDigits: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  timerSub: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  distractionSection: {
    marginBottom: spacing.lg,
  },
  distractionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 179, 71, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 71, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  distractionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.orange,
    marginLeft: spacing.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  pauseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  pauseText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  resumeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  resumeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
    marginLeft: spacing.xs,
  },
  finishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(184, 255, 61, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  finishText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  reviewBody: {
    paddingVertical: spacing.sm,
  },
  reviewSummaryCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  reviewDuration: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginVertical: 4,
  },
  reviewMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  notesInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    height: 70,
    textAlignVertical: 'top',
  },
});
