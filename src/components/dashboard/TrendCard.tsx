/**
 * TrendCard – LifeLens Dashboard Component
 *
 * 30-day Life Score trend with pill-style time filters and minimal bar chart.
 * The current score dominates; chart is a supporting visual.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius }  from '@/src/theme/radius';

interface DataPoint {
  day:   string;
  value: number;
}

interface TrendCardProps {
  data?:         DataPoint[];
  latestScore?:  number;
  monthChange?:  string;
}

const TIMEFRAMES = ['7D', '14D', '30D', '90D'] as const;

const defaultData: DataPoint[] = [
  { day: 'W1', value: 78 },
  { day: 'W2', value: 80 },
  { day: 'W3', value: 76 },
  { day: 'W4', value: 82 },
  { day: 'W5', value: 81 },
  { day: 'W6', value: 83 },
  { day: 'W7', value: 84.5 },
];

export default function TrendCard({
  data         = defaultData,
  latestScore  = 84.5,
  monthChange  = '+3.2%',
}: TrendCardProps) {
  const [selected, setSelected] = useState<string>('30D');
  const maxVal = 100;
  const chartH = 80;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>30 Day Life Score</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber}>{latestScore.toFixed(1)}</Text>
            <View style={styles.changePill}>
              <Text style={styles.changeText}>{monthChange} this month</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Time filter pills */}
      <View style={styles.timeRow}>
        {TIMEFRAMES.map((tf) => (
          <Pressable
            key={tf}
            style={[styles.timePill, selected === tf && styles.timePillActive]}
            onPress={() => setSelected(tf)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === tf }}
          >
            <Text
              style={[styles.timePillText, selected === tf && styles.timePillTextActive]}
            >
              {tf}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Bar chart */}
      <View style={[styles.chart, { height: chartH + 20 }]}>
        {data.map((point, i) => {
          const barH = (point.value / maxVal) * chartH;
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={styles.barGroup}>
              <View style={[styles.barTrack, { height: chartH }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barH,
                      backgroundColor: isLast ? colors.primary : colors.surfaceHigh,
                    },
                  ]}
                />
              </View>
              <Text style={styles.dayLabel}>{point.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  changePill: {
    backgroundColor: 'rgba(66, 215, 122, 0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  timePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
  },
  timePillActive: {
    backgroundColor: colors.primary,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  timePillTextActive: {
    color: colors.background,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barTrack: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
