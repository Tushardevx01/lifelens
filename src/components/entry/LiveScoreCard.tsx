import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/radius';
import { spacing } from '@/src/theme/spacing';
import type { LifeScoreBreakdown } from '@/src/utils/lifeScore';

interface LiveScoreCardProps {
  breakdown: LifeScoreBreakdown;
}

export function LiveScoreCard({ breakdown }: LiveScoreCardProps) {
  const { life_score, sleep_score, productivity_score, health_score, finance_score, mood_adjustment, band } =
    breakdown;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.badgeRow}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.badgeText}>LIVE SCORE ESTIMATOR</Text>
          </View>
          <Text style={styles.title}>Projected Life Score</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: band.color }]}>
            {life_score.toFixed(1)}
          </Text>
          <View style={[styles.bandPill, { backgroundColor: `${band.color}20` }]}>
            <Text style={[styles.bandText, { color: band.color }]}>{band.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Sleep (30%)</Text>
          <Text style={styles.metricScore}>{sleep_score.toFixed(0)}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, sleep_score)}%`, backgroundColor: '#00D4AA' },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Productivity (25%)</Text>
          <Text style={styles.metricScore}>{productivity_score.toFixed(0)}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, productivity_score)}%`, backgroundColor: '#4A9EFF' },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Health (25%)</Text>
          <Text style={styles.metricScore}>{health_score.toFixed(0)}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, health_score)}%`, backgroundColor: '#B8FF00' },
              ]}
            />
          </View>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Finance (20%)</Text>
          <Text style={styles.metricScore}>{finance_score.toFixed(0)}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, finance_score)}%`, backgroundColor: '#FF9F43' },
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
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.25)',
    marginBottom: spacing.lg,
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
    color: colors.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
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
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  metricScore: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
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

