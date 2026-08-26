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
import { shadows } from '@/src/theme/shadows';
import CircularProgress from './CircularProgress';

interface LifeScoreHeroProps {
  score?:  number;
  change?: number;
}

export default function LifeScoreHero({
  score  = 84.5,
  change = 2.3,
}: LifeScoreHeroProps) {
  const isPositive = change >= 0;
  const changeSign = isPositive ? '+' : '';

  return (
    <View style={styles.card}>
      {/* Label */}
      <Text style={styles.eyebrow}>Today's Life Score</Text>

      {/* Score row */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreTextBlock}>
          <Text style={styles.scoreNumber}>{score.toFixed(1)}</Text>
          <Text style={styles.scoreUnit}>/100</Text>
        </View>

        {/* Circular progress ring */}
        <CircularProgress
          size={108}
          progress={score}
          color={colors.primary}
          strokeWidth={10}
          backgroundColor={colors.surfaceHigh}
        >
          <Text style={styles.ringNumber}>{Math.round(score)}</Text>
        </CircularProgress>
      </View>

      {/* Change indicator */}
      <View style={styles.changeRow}>
        <View
          style={[
            styles.changePill,
            { backgroundColor: isPositive ? 'rgba(66, 215, 122, 0.12)' : 'rgba(255, 99, 109, 0.12)' },
          ]}
        >
          <Text
            style={[
              styles.changeText,
              { color: isPositive ? colors.green : colors.red },
            ]}
          >
            {isPositive ? '↑' : '↓'} {changeSign}{change.toFixed(1)} from yesterday
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.hero,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: spacing.md,
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
