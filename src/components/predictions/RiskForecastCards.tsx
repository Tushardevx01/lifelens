import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import type { CompositeRiskForecastResponse } from '@/src/types/api.types';

interface RiskForecastCardsProps {
  forecast?: CompositeRiskForecastResponse | null;
}

export function RiskForecastCards({ forecast }: RiskForecastCardsProps) {
  if (!forecast) return null;

  const { workout_skip, budget_overrun, circadian_drift, overall_risk_score } = forecast;

  const workoutProbPct = Math.round(workout_skip.probability * 100);
  const workoutColor =
    workout_skip.risk_level === 'CRITICAL'
      ? colors.error
      : workout_skip.risk_level === 'HIGH'
        ? colors.orange
        : workout_skip.risk_level === 'MODERATE'
          ? colors.yellow
          : colors.primary;

  const budgetColor =
    budget_overrun.risk_status === 'DEFICIT_EXCEEDED'
      ? colors.error
      : budget_overrun.risk_status === 'OVERRUN_IMMINENT'
        ? colors.orange
        : budget_overrun.risk_status === 'CAUTION'
          ? colors.yellow
          : colors.primary;

  const circadianColor =
    circadian_drift.alert_level === 'CRITICAL'
      ? colors.error
      : circadian_drift.alert_level === 'HIGH'
        ? colors.orange
        : circadian_drift.alert_level === 'MODERATE'
          ? colors.yellow
          : colors.primary;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleGroup}>
          <Text style={styles.sectionTitle}>Behavioral Risk Forecasting</Text>
          <Text style={styles.sectionSubtitle}>
            Specialized multi-head predictive models
          </Text>
        </View>
        <View style={styles.compositeBadge}>
          <Text style={styles.compositeScore}>{Math.round(overall_risk_score)}</Text>
          <Text style={styles.compositeLabel}>Risk Index</Text>
        </View>
      </View>

      {/* 1. Workout Skip Risk Head */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <Ionicons name="barbell-outline" size={18} color={workoutColor} />
            <Text style={styles.cardTitle}>Workout Skip Risk</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: workoutColor }]}>
            <Text style={[styles.statusPillText, { color: workoutColor }]}>
              {workoutProbPct}% • {workout_skip.risk_level}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${workoutProbPct}%`, backgroundColor: workoutColor },
            ]}
          />
        </View>

        <Text style={styles.driverText}>
          <Text style={styles.boldLabel}>Primary Driver: </Text>
          {workout_skip.primary_driver}
        </Text>
        <Text style={styles.adviceText}>{workout_skip.mitigation_strategy}</Text>
      </View>

      {/* 2. Budget Overrun Forecaster */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <Ionicons name="wallet-outline" size={18} color={budgetColor} />
            <Text style={styles.cardTitle}>Budget Overrun Forecaster</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: budgetColor }]}>
            <Text style={[styles.statusPillText, { color: budgetColor }]}>
              {budget_overrun.risk_status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Daily Burn Rate</Text>
            <Text style={styles.metricValue}>
              ₹{Math.round(budget_overrun.current_daily_velocity).toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Daily Safe Cap</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              ₹{Math.round(budget_overrun.recommended_daily_cap).toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Days Remaining</Text>
            <Text style={styles.metricValue}>{budget_overrun.days_remaining}d</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Projected Overrun</Text>
            <Text style={[styles.metricValue, { color: budget_overrun.projected_overrun > 0 ? colors.orange : colors.primary }]}>
              ₹{Math.round(budget_overrun.projected_overrun).toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={styles.adviceText}>{budget_overrun.actionable_advice}</Text>
      </View>

      {/* 3. Circadian Drift Detector */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <Ionicons name="moon-outline" size={18} color={circadianColor} />
            <Text style={styles.cardTitle}>Circadian Drift Detector</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: circadianColor }]}>
            <Text style={[styles.statusPillText, { color: circadianColor }]}>
              {circadian_drift.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.circadianRow}>
          <View style={styles.circadianPill}>
            <Text style={styles.circadianPillLabel}>Bedtime Variance</Text>
            <Text style={styles.circadianPillValue}>
              ±{Math.round(circadian_drift.bedtime_variance_minutes)} min
            </Text>
          </View>
          <View style={styles.circadianPill}>
            <Text style={styles.circadianPillLabel}>Social Jetlag</Text>
            <Text style={styles.circadianPillValue}>
              {Math.round(circadian_drift.social_jetlag_minutes)} min
            </Text>
          </View>
          <View style={styles.circadianPill}>
            <Text style={styles.circadianPillLabel}>Mean Bedtime</Text>
            <Text style={styles.circadianPillValue}>{circadian_drift.average_bedtime}</Text>
          </View>
        </View>

        <Text style={styles.adviceText}>{circadian_drift.resynchronization_protocol}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleGroup: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  compositeBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compositeScore: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  compositeLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  driverText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  boldLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  adviceText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  circadianRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  circadianPill: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  circadianPillLabel: {
    color: colors.textMuted,
    fontSize: 9,
    marginBottom: 2,
  },
  circadianPillValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});

