import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface DataPoint {
  day: string;
  life: number;
  sleep: number;
  productivity: number;
}

interface LifeScoreTrendProps {
  data?: DataPoint[];
}

const timeframes = ['7d', '14d', '30d', '90d'] as const;

const defaultData: DataPoint[] = [
  { day: 'Mon', life: 78, sleep: 80, productivity: 75 },
  { day: 'Tue', life: 82, sleep: 85, productivity: 80 },
  { day: 'Wed', life: 75, sleep: 70, productivity: 78 },
  { day: 'Thu', life: 88, sleep: 90, productivity: 85 },
  { day: 'Fri', life: 85, sleep: 82, productivity: 88 },
  { day: 'Sat', life: 90, sleep: 92, productivity: 86 },
  { day: 'Sun', life: 84, sleep: 88, productivity: 80 },
];

export default function LifeScoreTrend({ data = defaultData }: LifeScoreTrendProps) {
  const [selected, setSelected] = useState<string>('7d');
  const maxScore = 100;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>30-Day Life Score Trend</Text>

      <View style={styles.timeframeRow}>
        {timeframes.map((tf) => (
          <Pressable
            key={tf}
            style={[styles.timeframeBtn, selected === tf && styles.timeframeActive]}
            onPress={() => setSelected(tf)}
          >
            <Text
              style={[styles.timeframeText, selected === tf && styles.timeframeTextActive]}
            >
              {tf}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chart}>
        {data.map((point, i) => {
          const lifeHeight = (point.life / maxScore) * 120;
          const sleepHeight = (point.sleep / maxScore) * 120;
          const prodHeight = (point.productivity / maxScore) * 120;

          return (
            <View key={i} style={styles.barGroup}>
              <View style={styles.bars}>
                <View style={[styles.bar, { height: lifeHeight, backgroundColor: colors.primary }]} />
                <View style={[styles.bar, { height: sleepHeight, backgroundColor: '#00D4AA' }]} />
                <View style={[styles.bar, { height: prodHeight, backgroundColor: '#4A9EFF' }]} />
              </View>
              <Text style={styles.dayLabel}>{point.day}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Life</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#00D4AA' }]} />
          <Text style={styles.legendText}>Sleep</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4A9EFF' }]} />
          <Text style={styles.legendText}>Productivity</Text>
        </View>
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
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  timeframeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  timeframeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  timeframeActive: {
    backgroundColor: colors.primary,
  },
  timeframeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: '#000',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginBottom: spacing.md,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  bars: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'flex-end',
    height: 120,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
});
