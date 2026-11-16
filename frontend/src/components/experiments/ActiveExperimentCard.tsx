import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { experimentsApi } from '@/src/services/api';
import type { ActiveExperimentProgress } from '@/src/types/api.types';

interface ActiveExperimentCardProps {
  progress: ActiveExperimentProgress;
  onRefresh?: () => void;
  onViewEvaluation: (experimentId: string) => void;
}

export function ActiveExperimentCard({
  progress,
  onRefresh,
  onViewEvaluation,
}: ActiveExperimentCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const exp = progress.experiment;

  const handleCheckin = async (adhered: boolean) => {
    try {
      setSubmitting(true);
      const todayStr = new Date().toISOString().split('T')[0];
      await experimentsApi.checkin(exp.id, {
        date: todayStr,
        adhered,
      });
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record check-in';
      Alert.alert('Check-in Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const metricLabel = exp.target_metric.replace(/_/g, ' ').toUpperCase();
  const isIncrease = exp.desired_direction === 'INCREASE';
  const delta = progress.interim_delta;
  const deltaPct = progress.interim_delta_pct;

  let deltaPositive = false;
  if (delta !== null && delta !== undefined) {
    deltaPositive = isIncrease ? delta > 0 : delta < 0;
  }

  const signStr = delta !== null && delta !== undefined && delta > 0 ? '+' : '';

  return (
    <View style={styles.card}>
      {/* Top Banner */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Ionicons name="flask" size={13} color={colors.darkButton} />
          <Text style={styles.badgeText}>CORE EXPERIMENT</Text>
        </View>
        <View style={styles.dayPill}>
          <Text style={styles.dayPillText}>
            Day {progress.current_day} of {progress.total_days}
          </Text>
        </View>
      </View>

      {/* Title & Intervention Rule */}
      <Text style={styles.title}>{exp.title}</Text>
      <View style={styles.ruleBox}>
        <Ionicons name="checkbox-outline" size={15} color={colors.darkButton} style={styles.ruleIcon} />
        <Text style={styles.ruleText}>
          <Text style={styles.ruleLabel}>Rule: </Text>
          {exp.intervention_rule}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.max(5, progress.progress_percentage))}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progress.progress_percentage)}% complete · {progress.days_remaining}d left
        </Text>
      </View>

      {/* Real-time Metric Comparison Bar */}
      <View style={styles.metricRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricEyebrow}>BASELINE ({metricLabel})</Text>
          <Text style={styles.metricVal}>
            {progress.baseline_mean !== null ? progress.baseline_mean.toFixed(1) : '—'}
          </Text>
        </View>

        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />

        <View style={styles.metricItem}>
          <Text style={styles.metricEyebrow}>CURRENT AVG</Text>
          <Text style={styles.metricVal}>
            {progress.current_treatment_mean !== null ? progress.current_treatment_mean.toFixed(1) : '—'}
          </Text>
        </View>

        {delta !== null && delta !== undefined && (
          <View
            style={[
              styles.deltaBadge,
              deltaPositive ? styles.deltaBadgeSuccess : styles.deltaBadgeWarning,
            ]}
          >
            <Ionicons
              name={deltaPositive ? 'trending-up' : 'trending-down'}
              size={13}
              color={deltaPositive ? colors.green : colors.orange}
            />
            <Text
              style={[
                styles.deltaText,
                { color: deltaPositive ? colors.green : colors.orange },
              ]}
            >
              {signStr}{delta.toFixed(1)} ({deltaPct !== null ? `${deltaPct}%` : ''})
            </Text>
          </View>
        )}
      </View>

      {/* Daily Adherence Action Section */}
      <View style={styles.checkinSection}>
        <View style={styles.checkinHeaderRow}>
          <Text style={styles.checkinPrompt}>Today's Adherence</Text>
          <Text style={styles.adherenceRateText}>
            {progress.current_adherence_rate}% adherence ({progress.days_adhered}/{progress.checkins_completed}d)
          </Text>
        </View>

        {progress.checked_in_today ? (
          <View style={styles.checkedInRow}>
            <View style={styles.checkedInStatus}>
              <Ionicons
                name={progress.today_adherence ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={progress.today_adherence ? colors.green : colors.error}
              />
              <Text style={styles.checkedInText}>
                {progress.today_adherence ? 'Rule followed today' : 'Intervention missed today'}
              </Text>
            </View>
            <Pressable
              style={styles.changeBtn}
              onPress={() => handleCheckin(!progress.today_adherence)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Change today's checkin"
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.btnRow}>
            <Pressable
              style={[styles.adhereBtn, styles.adhereSuccess]}
              onPress={() => handleCheckin(true)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Confirm rule followed today"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                  <Text style={styles.btnTextSuccess}>I Followed the Rule</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.adhereBtn, styles.adhereMissed]}
              onPress={() => handleCheckin(false)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Mark rule missed today"
            >
              <Ionicons name="close-sharp" size={15} color={colors.secondaryText} />
              <Text style={styles.btnTextMissed}>Missed</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Footer / Evaluation Action */}
      <Pressable
        style={styles.evaluationLink}
        onPress={() => onViewEvaluation(exp.id)}
        accessibilityRole="button"
        accessibilityLabel="View full statistical evaluation"
      >
        <Text style={styles.evaluationLinkText}>
          {progress.current_day >= progress.total_days
            ? '★ View Final Statistical Evaluation'
            : 'View Live Statistical Evaluation & Delta'}
        </Text>
        <Ionicons name="chevron-forward" size={15} color={colors.darkButton} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.darkButton,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFEDE1',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.darkButton,
    letterSpacing: 0.6,
  },
  dayPill: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryText,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  ruleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  ruleIcon: {
    marginRight: spacing.xs,
    marginTop: 2,
  },
  ruleText: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
    flex: 1,
  },
  ruleLabel: {
    fontWeight: '700',
    color: colors.primaryText,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.darkButton,
    borderRadius: radius.full,
  },
  progressText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricEyebrow: {
    fontSize: 9,
    color: colors.secondaryText,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    marginTop: 2,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  deltaBadgeSuccess: {
    backgroundColor: '#EDF5DC',
  },
  deltaBadgeWarning: {
    backgroundColor: '#FFF2E6',
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checkinSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkinHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  checkinPrompt: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryText,
  },
  adherenceRateText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  adhereBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  adhereSuccess: {
    flex: 2,
    backgroundColor: colors.darkButton,
  },
  adhereMissed: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnTextSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnTextMissed: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  checkedInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: 4,
  },
  checkedInStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkedInText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
  },
  changeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  changeBtnText: {
    fontSize: 12,
    color: colors.darkButton,
    fontWeight: '600',
  },
  evaluationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  evaluationLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkButton,
  },
});
