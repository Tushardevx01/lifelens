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
  { name: 'Sleep',        score: 88, color: colors.cyan   },
  { name: 'Productivity', score: 85, color: colors.blue   },
  { name: 'Health',       score: 82, color: colors.green  },
  { name: 'Finance',      score: 80, color: colors.orange },
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
              strokeWidth={3}
              backgroundColor={colors.surfaceHigh}
            />
          </View>

          {/* Large number */}
          <Text style={[styles.score, { color: metric.color }]}>
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
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    // Two-column: slightly less than half width accounting for gap
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  score: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 42,
  },
  unit: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
    marginTop: 2,
  },
});
