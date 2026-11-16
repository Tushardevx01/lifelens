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

export default function Correlations({
  correlations = [],
}: CorrelationsProps) {
  if (correlations.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Key Correlations</Text>
        <Text style={styles.emptyText}>
          No correlations discovered yet (minimum 7 days of logs required).
        </Text>
      </View>
    );
  }

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
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});
