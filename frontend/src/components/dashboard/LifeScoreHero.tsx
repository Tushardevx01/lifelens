/**
 * LifeScoreHero – LifeLens Dashboard Component
 *
 * Large hero card displaying today's real synthesized Life Score.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius }  from '@/src/theme/radius';
import CircularProgress from './CircularProgress';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { getScoreClassification } from '@/src/utils/scoreClassification';

interface LifeScoreHeroProps {
  score?:  number;
  change?: number;
}

export default function LifeScoreHero({
  score = 0,
  change = 0,
}: LifeScoreHeroProps) {
  const hasScore = typeof score === 'number' && !isNaN(score) && score > 0;
  const safeScore = hasScore ? score : 0;
  const safeChange = typeof change === 'number' && !isNaN(change) ? change : 0;
  const isPositive = safeChange >= 0;
  const changeSign = isPositive ? '+' : '';
  const classification = getScoreClassification(hasScore ? safeScore : null);
  const scoreColor = hasScore ? classification.color : colors.textMuted;

  return (
    <View style={styles.card}>
      {/* Label and Category badge */}
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>Today's Life Score</Text>
        {hasScore ? (
          <ScoreBadge score={safeScore} size="sm" />
        ) : (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Pending Today's Logs</Text>
          </View>
        )}
      </View>

      {/* Score row */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreTextBlock}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>
            {hasScore ? safeScore.toFixed(1) : '--'}
          </Text>
          <Text style={styles.scoreUnit}>/100</Text>
        </View>

        {/* Circular progress ring */}
        <CircularProgress
          size={108}
          progress={safeScore}
          color={scoreColor}
          strokeWidth={10}
          backgroundColor={colors.surfaceSecondary}
        >
          <Text style={[styles.ringNumber, { color: scoreColor }]}>
            {hasScore ? Math.round(safeScore) : '--'}
          </Text>
        </CircularProgress>
      </View>

      {/* Change indicator */}
      <View style={styles.changeRow}>
        {hasScore && Math.abs(safeChange) > 0 ? (
          <View
            style={[
              styles.changePill,
              { backgroundColor: isPositive ? colors.softGreen : '#FDE8E8' },
            ]}
          >
            <Text
              style={[
                styles.changeText,
                { color: isPositive ? '#15803D' : colors.error },
              ]}
            >
              {isPositive ? '↑' : '↓'} {changeSign}{safeChange.toFixed(1)} from yesterday
            </Text>
          </View>
        ) : (
          <Text style={styles.emptyChangeText}>
            {hasScore ? 'Baseline maintained vs yesterday' : 'Log sleep, focus, or workouts to calculate today\'s score'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.hero,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.secondaryText,
  },
  pendingBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  scoreTextBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 62,
  },
  scoreUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondaryText,
    marginLeft: spacing.xs,
  },
  ringNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyChangeText: {
    fontSize: 12,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
});
