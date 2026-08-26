import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface Category {
  name: string;
  score: number;
  color: string;
}

interface ScoreBreakdownProps {
  categories?: Category[];
}

const defaultCategories: Category[] = [
  { name: 'Sleep', score: 82, color: '#00D4AA' },
  { name: 'Productivity', score: 91, color: '#4A9EFF' },
  { name: 'Health', score: 78, color: '#B8FF00' },
  { name: 'Finance', score: 85, color: '#FF9F43' },
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
      {categories.map((cat) => (
        <View key={cat.name} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <Text style={[styles.score, { color: cat.color }]}>{cat.score}</Text>
          </View>
          <View style={styles.barRow}>
            <AnimatedBar score={cat.score} color={cat.color} />
            <Text style={styles.percentage}>{cat.score}%</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
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
  categoryName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    color: colors.textMuted,
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
});
