import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface CorrelationItem {
  score: number;
  title: string;
  description: string;
}

interface CorrelationsProps {
  correlations?: CorrelationItem[];
}

const defaultCorrelations: CorrelationItem[] = [
  {
    score: 0.87,
    title: 'Sleep & Productivity',
    description: 'Better sleep leads to 23% higher productivity',
  },
  {
    score: -0.62,
    title: 'Stress & Exercise',
    description: 'Regular exercise reduces stress by 34%',
  },
  {
    score: 0.71,
    title: 'Meditation & Focus',
    description: 'Meditation improves focus duration by 18%',
  },
];

export default function Correlations({
  correlations = defaultCorrelations,
}: CorrelationsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Key Correlations</Text>
      {correlations.map((item, index) => {
        const isPositive = item.score > 0;
        return (
          <View
            key={index}
            style={[styles.row, index === correlations.length - 1 && styles.lastRow]}
          >
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: isPositive ? '#00D4AA20' : '#FF9F4A20' },
              ]}
            >
              <Text
                style={[
                  styles.scoreText,
                  { color: isPositive ? '#00D4AA' : '#FF9F4A' },
                ]}
              >
                {isPositive ? '+' : ''}
                {item.score.toFixed(2)}
              </Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
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
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  scoreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    minWidth: 52,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDescription: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
