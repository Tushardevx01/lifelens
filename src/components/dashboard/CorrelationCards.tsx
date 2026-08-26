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

interface CorrelationCardsProps {
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

export default function CorrelationCards({
  correlations = defaultCorrelations,
}: CorrelationCardsProps) {
  return (
    <View style={styles.container}>
      {correlations.map((item, index) => {
        const isPositive = item.score > 0;
        const barWidth = Math.abs(item.score) * 100;
        return (
          <View key={index} style={styles.card}>
            <View style={styles.topRow}>
              <View
                style={[
                  styles.scoreBadge,
                  {
                    backgroundColor: isPositive
                      ? 'rgba(72, 216, 107, 0.12)'
                      : 'rgba(255, 179, 71, 0.12)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    { color: isPositive ? colors.green : colors.orange },
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
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${barWidth}%`,
                    backgroundColor: isPositive ? colors.green : colors.orange,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
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
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  itemDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
