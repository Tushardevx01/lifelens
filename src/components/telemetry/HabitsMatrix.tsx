import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { telemetryApi } from '@/src/services/api';
import type { HabitWithStreak } from '@/src/types/api.types';

interface HabitsMatrixProps {
  onStreakUpdate?: () => void;
}

const DOMAINS = ['Health', 'Mindfulness', 'Productivity', 'Sleep', 'Learning', 'Finance'];

export function HabitsMatrix({ onStreakUpdate }: HabitsMatrixProps) {
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDomain, setNewHabitDomain] = useState('Health');
  const [submitting, setSubmitting] = useState(false);

  const loadHabits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await telemetryApi.habits.list();
      setHabits(data || []);
    } catch {
      // Fallback to local empty or cached
      setHabits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const toggleHabitToday = async (habit: HabitWithStreak) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newStatus = !habit.completed_today;

    // Optimistic UI update
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === habit.id) {
          const delta = newStatus ? 1 : -1;
          const newStreak = Math.max(0, h.current_streak + delta);
          return {
            ...h,
            completed_today: newStatus,
            current_streak: newStreak,
            best_streak: Math.max(h.best_streak, newStreak),
          };
        }
        return h;
      })
    );

    try {
      await telemetryApi.habits.logHabit({
        habit_id: habit.id,
        date: todayStr,
        completed: newStatus,
        value: 1.0,
      });
      if (onStreakUpdate) onStreakUpdate();
    } catch (err: unknown) {
      // Revert on error
      const msg = err instanceof Error ? err.message : 'Could not update habit log.';
      Alert.alert('Update Failed', msg);
      loadHabits();
    }
  };

  const handleCreateHabit = async () => {
    if (!newHabitName.trim()) {
      Alert.alert('Habit Name Required', 'Please enter a name for your habit.');
      return;
    }

    try {
      setSubmitting(true);
      await telemetryApi.habits.create({
        name: newHabitName.trim(),
        domain: newHabitDomain,
        frequency: 'daily',
        target_per_day: 1,
      });

      setNewHabitName('');
      setModalVisible(false);
      loadHabits();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create habit.';
      Alert.alert('Create Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = habits.filter((h) => h.completed_today).length;
  const totalCount = habits.length;

  return (
    <View style={styles.container}>
      {/* Card Header */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Daily Habits</Text>
            {totalCount > 0 && (
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>
                  {completedCount}/{totalCount} Done
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.cardSubtitle}>
            Track recurring rituals & maintain behavioral streaks
          </Text>
        </View>

        <Pressable
          style={styles.addHabitButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Add Habit"
        >
          <Ionicons name="add" size={18} color={colors.background} />
        </Pressable>
      </View>

      {/* Body List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : habits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Habits Defined Yet</Text>
          <Text style={styles.emptyDesc}>
            Add daily routines like "Read 30m" or "No screens after 11 PM" to build consistency.
          </Text>
          <Pressable style={styles.emptyAddBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyAddBtnText}>+ Add First Habit</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.habitList}>
          {habits.map((habit) => {
            const isDone = habit.completed_today;
            return (
              <View key={habit.id} style={styles.habitItem}>
                <Pressable
                  style={styles.habitMainRow}
                  onPress={() => toggleHabitToday(habit)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                >
                  {/* Checkbox Icon */}
                  <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                    {isDone && <Ionicons name="checkmark" size={16} color={colors.background} />}
                  </View>

                  {/* Habit Info */}
                  <View style={styles.habitInfo}>
                    <Text style={[styles.habitName, isDone && styles.habitNameDone]}>
                      {habit.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.domainTag}>{habit.domain}</Text>
                      {habit.current_streak > 0 && (
                        <View style={styles.streakBadge}>
                          <Text style={styles.streakText}>🔥 {habit.current_streak}d streak</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>

                {/* 7-Day History Mini Dots */}
                <View style={styles.dotsRow}>
                  {(habit.history_7d || []).map((dot) => (
                    <View key={dot.date} style={styles.dotColumn}>
                      <View style={[styles.historyDot, dot.completed && styles.historyDotDone]} />
                      <Text style={styles.dotDayLabel}>{dot.day_name.charAt(0)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Add Habit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Habit</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Habit Title</Text>
              <TextInput
                style={styles.modalInput}
                value={newHabitName}
                onChangeText={setNewHabitName}
                placeholder="e.g. Read 30m before bed, Walk 8,000 steps"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Domain</Text>
              <View style={styles.domainPills}>
                {DOMAINS.map((dom) => {
                  const sel = newHabitDomain === dom;
                  return (
                    <Pressable
                      key={dom}
                      style={[styles.domPill, sel && styles.domPillActive]}
                      onPress={() => setNewHabitDomain(dom)}
                    >
                      <Text style={[styles.domPillText, sel && styles.domPillTextActive]}>
                        {dom}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.createBtn, submitting && { opacity: 0.6 }]}
                onPress={handleCreateHabit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.createBtnText}>Save Habit</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressBadge: {
    backgroundColor: 'rgba(184, 255, 61, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: spacing.xs,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addHabitButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyAddBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(184, 255, 61, 0.1)',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  habitList: {
    gap: spacing.sm,
  },
  habitItem: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  habitNameDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: spacing.xs,
  },
  domainTag: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 179, 71, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.orange,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: spacing.xs,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  dotColumn: {
    alignItems: 'center',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotDayLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: spacing.md,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBody: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  domainPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  domPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  domPillActive: {
    backgroundColor: 'rgba(184, 255, 61, 0.15)',
    borderColor: colors.primary,
  },
  domPillText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  domPillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
    textTransform: 'uppercase',
  },
});
