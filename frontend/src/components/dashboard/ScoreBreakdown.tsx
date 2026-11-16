import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { getScoreClassification } from '@/src/utils/scoreClassification';

interface Category {
  name: string;
  score: number;
  color: string;
}

interface ScoreBreakdownProps {
  categories?: Category[];
}

const defaultCategories: Category[] = [
  { name: 'Sleep', score: 82, color: '#7C3AED' },
  { name: 'Productivity', score: 91, color: '#2563EB' },
  { name: 'Health', score: 78, color: '#15803D' },
  { name: 'Finance', score: 85, color: '#C05621' },
];

function AnimatedBar({ score, color }: { score: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: score,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [score, width]);

  const barWidth = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.barBackground}>
      <Animated.View
        style={[styles.barFill, { width: barWidth, backgroundColor: color }]}
      />
    </View>
  );
}

export default function ScoreBreakdown({
  categories = defaultCategories,
}: ScoreBreakdownProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Score Breakdown</Text>
      {categories.map((cat) => {
        const catClass = getScoreClassification(cat.score);
        return (
          <View key={cat.name} style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={styles.rowLabelGroup}>
                <View style={[styles.dot, { backgroundColor: catClass.color }]} />
                <Text style={styles.categoryName}>{cat.name}</Text>
              </View>
              <View style={styles.rowScoreGroup}>
                <Text style={[styles.score, { color: catClass.color }]}>
                  {cat.score}
                  <Text style={styles.scoreOutOf}>/100</Text>
                </Text>
                <ScoreBadge score={cat.score} size="xs" />
              </View>
            </View>
            <View style={styles.barRow}>
              <AnimatedBar score={cat.score} color={catClass.color} />
              <Text style={[styles.percentage, { color: catClass.color }]}>
                {cat.score}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  row: {
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  rowScoreGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  score: {
    fontSize: 14,
    fontWeight: '800',
  },
  scoreOutOf: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  percentage: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 38,
    textAlign: 'right',
  },
});
