import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface CategoryScore {
  name: string;
  score: number;
  color: string;
}

interface LifeScoreCardProps {
  score: number;
  change: number;
  categories?: CategoryScore[];
}

const defaultCategories: CategoryScore[] = [
  { name: 'Sleep', score: 82, color: '#00D4AA' },
  { name: 'Productivity', score: 91, color: '#4A9EFF' },
  { name: 'Health', score: 78, color: '#B8FF00' },
  { name: 'Finance', score: 85, color: '#FF9F43' },
];

export default function LifeScoreCard({
  score,
  change,
  categories = defaultCategories,
}: LifeScoreCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{score.toFixed(1)}</Text>
        <Text style={styles.divider}>/100</Text>
      </View>
      <View style={styles.changeContainer}>
        <Text style={[styles.change, change >= 0 && styles.positive]}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(1)} vs yesterday
        </Text>
      </View>

      <View style={styles.categoriesGrid}>
        {categories.map((cat) => (
          <View key={cat.name} style={styles.categoryItem}>
            <View style={styles.categoryHeader}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text style={styles.categoryName}>{cat.name}</Text>
            </View>
            <Text style={[styles.categoryScore, { color: cat.color }]}>
              {cat.score}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.xl,
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  score: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
  },
  divider: {
    color: colors.textMuted,
    fontSize: 20,
    marginLeft: spacing.xs,
  },
  changeContainer: {
    marginBottom: spacing.xl,
  },
  change: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  positive: {
    color: '#00D4AA',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  categoryItem: {
    width: '50%',
    padding: spacing.sm,
    boxSizing: 'border-box',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  categoryScore: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 16,
  },
});
