import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/radius';
import { spacing } from '@/src/theme/spacing';
import type { LifeScoreBreakdown } from '@/src/utils/lifeScore';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { getScoreClassification } from '@/src/utils/scoreClassification';

interface LiveScoreCardProps {
  breakdown: LifeScoreBreakdown;
}

export function LiveScoreCard({ breakdown }: LiveScoreCardProps) {
  const { life_score, sleep_score, productivity_score, health_score, finance_score, mood_adjustment } =
    breakdown;

  const lifeClass = getScoreClassification(life_score);
  const sleepClass = getScoreClassification(sleep_score);
  const prodClass = getScoreClassification(productivity_score);
  const healthClass = getScoreClassification(health_score);
  const finClass = getScoreClassification(finance_score);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.badgeRow}>
            <Ionicons name="sparkles" size={14} color="#66300C" />
            <Text style={styles.badgeText}>LIVE SCORE ESTIMATOR</Text>
          </View>
          <Text style={styles.title}>Projected Life Score</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: lifeClass.color }]}>
            {life_score.toFixed(1)}
          </Text>
          <ScoreBadge score={life_score} size="sm" />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <View style={styles.metricItemHeader}>
            <Text style={styles.metricLabel}>Sleep (30%)</Text>
            <ScoreBadge score={sleep_score} size="xs" />
          </View>
          <Text style={[styles.metricScore, { color: sleepClass.color }]}>
            {sleep_score.toFixed(0)} <Text style={styles.metricOutOf}>/100</Text>
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, sleep_score)}%`, backgroundColor: sleepClass.color },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricItemHeader}>
            <Text style={styles.metricLabel}>Productivity (25%)</Text>
            <ScoreBadge score={productivity_score} size="xs" />
          </View>
          <Text style={[styles.metricScore, { color: prodClass.color }]}>
            {productivity_score.toFixed(0)} <Text style={styles.metricOutOf}>/100</Text>
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, productivity_score)}%`, backgroundColor: prodClass.color },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricItemHeader}>
            <Text style={styles.metricLabel}>Health (25%)</Text>
            <ScoreBadge score={health_score} size="xs" />
          </View>
          <Text style={[styles.metricScore, { color: healthClass.color }]}>
            {health_score.toFixed(0)} <Text style={styles.metricOutOf}>/100</Text>
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, health_score)}%`, backgroundColor: healthClass.color },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricItemHeader}>
            <Text style={styles.metricLabel}>Finance (20%)</Text>
            <ScoreBadge score={finance_score} size="xs" />
          </View>
          <Text style={[styles.metricScore, { color: finClass.color }]}>
            {finance_score.toFixed(0)} <Text style={styles.metricOutOf}>/100</Text>
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, finance_score)}%`, backgroundColor: finClass.color },
              ]}
            />
          </View>
        </View>
      </View>

      {mood_adjustment !== 0 ? (
        <View style={styles.moodAdjRow}>
          <Text style={styles.moodAdjLabel}>Mood Impact:</Text>
          <Text
            style={[
              styles.moodAdjValue,
              { color: mood_adjustment > 0 ? colors.primary : colors.error },
            ]}
          >
            {mood_adjustment > 0 ? `+${mood_adjustment.toFixed(1)}` : mood_adjustment.toFixed(1)} pts
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleCol: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#66300C',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryText,
  },
  scoreContainer: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  bandPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  bandText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    gap: 4,
  },
  metricItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '600',
  },
  metricScore: {
    fontSize: 15,
    fontWeight: '800',
  },
  metricOutOf: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  moodAdjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  moodAdjLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  moodAdjValue: {
    fontSize: 12,
    fontWeight: '700',
  },
});

