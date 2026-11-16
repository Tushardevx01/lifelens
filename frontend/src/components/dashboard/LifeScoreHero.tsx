/**
 * LifeScoreHero – LifeLens Dashboard Component
 *
 * Premium large hero card.  The number dominates visually.
 *
 * Layout:
 *   Today's Life Score
 *   84.5             ◯ ring
 *   /100
 *   ↑ 2.3 from yesterday
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
  score  = 84.5,
  change = 2.3,
}: LifeScoreHeroProps) {
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 84.5;
  const safeChange = typeof change === 'number' && !isNaN(change) ? change : 2.3;
  const isPositive = safeChange >= 0;
  const changeSign = isPositive ? '+' : '';
  const classification = getScoreClassification(safeScore);

  return (
    <View style={styles.card}>
      {/* Label and Category badge */}
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>Today's Life Score</Text>
        <ScoreBadge score={safeScore} size="sm" />
      </View>

      {/* Score row */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreTextBlock}>
          <Text style={[styles.scoreNumber, { color: classification.color }]}>
            {safeScore.toFixed(1)}
          </Text>
          <Text style={styles.scoreUnit}>/100</Text>
        </View>

        {/* Circular progress ring */}
        <CircularProgress
          size={108}
          progress={safeScore}
          color={classification.color}
          strokeWidth={10}
          backgroundColor={colors.surfaceSecondary}
        >
          <Text style={[styles.ringNumber, { color: classification.color }]}>
            {Math.round(safeScore)}
          </Text>
        </CircularProgress>
      </View>

      {/* Change indicator */}
      <View style={styles.changeRow}>
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
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.3,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  scoreTextBlock: {
    flex: 1,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -3,
    lineHeight: 68,
  },
  scoreUnit: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: -0.3,
    marginTop: spacing.xs,
  },
  ringNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  changeRow: {
    flexDirection: 'row',
  },
  changePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
