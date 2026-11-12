/**
 * MetricGrid – LifeLens Dashboard Component
 *
 * 2-column grid of compact metric cards (Sleep, Productivity, Health, Finance).
 * Each card shows a large score number and a small circular indicator.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius }  from '@/src/theme/radius';
import CircularProgress from './CircularProgress';

interface Metric {
  name:  string;
  score: number;
  color: string;
}

interface MetricGridProps {
  metrics?: Metric[];
}

const defaultMetrics: Metric[] = [
  { name: 'Sleep',        score: 88, color: '#7C3AED' },
  { name: 'Productivity', score: 85, color: '#2563EB' },
  { name: 'Health',       score: 82, color: '#15803D' },
  { name: 'Finance',      score: 80, color: '#C05621' },
];

export default function MetricGrid({ metrics = defaultMetrics }: MetricGridProps) {
  return (
    <View style={styles.container}>
      {metrics.map((metric) => (
        <View key={metric.name} style={styles.card}>
          {/* Name + ring */}
          <View style={styles.topRow}>
            <Text style={styles.name}>{metric.name}</Text>
            <CircularProgress
              size={36}
              progress={metric.score}
              color={metric.color}
              strokeWidth={4}
              backgroundColor={colors.surfaceSecondary}
            />
          </View>

          {/* Large number */}
          <Text style={styles.score}>
            {metric.score}
          </Text>
          <Text style={styles.unit}>/100</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  score: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 40,
    color: colors.primaryText,
  },
  unit: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
});
