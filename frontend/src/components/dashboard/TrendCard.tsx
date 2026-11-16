/**
 * TrendCard – LifeLens Dashboard Component
 *
 * Warm, minimal score trend with pill-style time filters, clean bar chart,
 * and score classification health indicators.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius }  from '@/src/theme/radius';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { getScoreClassification, SCORE_CATEGORIES } from '@/src/utils/scoreClassification';

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

export default function TrendCard({
  data         = [],
  latestScore  = 0,
  monthChange  = '0%',
}: TrendCardProps) {
  const [selected, setSelected] = useState<string>('30D');
  const maxVal = 100;
  const chartH = 80;
  const hasScore = latestScore > 0;
  const latestClass = getScoreClassification(latestScore);

  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>Score Trajectory</Text>
            <Text style={styles.emptyText}>No trend telemetry recorded yet.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>Score Trajectory</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNumber, { color: latestClass.color }]}>
              {hasScore ? latestScore.toFixed(1) : '—'}
            </Text>
            <Text style={styles.scoreOutOf}>/100</Text>
            {hasScore && <ScoreBadge score={latestScore} size="sm" />}
          </View>
        </View>

        {monthChange !== '0%' && (
          <View style={styles.changePill}>
            <Text style={styles.changeText}>{monthChange} this month</Text>
          </View>
        )}
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

      {/* Bar chart with category color-coded bars */}
      <View style={[styles.chart, { height: chartH + 24 }]}>
        {data.map((point, i) => {
          const barH = (point.value / maxVal) * chartH;
          const pointClass = getScoreClassification(point.value);
          return (
            <View key={i} style={styles.barGroup}>
              <View style={[styles.barTrack, { height: chartH }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barH,
                      backgroundColor: pointClass.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.dayLabel}>{point.day}</Text>
            </View>
          );
        })}
      </View>

      {/* Color-Coded Health Category Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SCORE_CATEGORIES.HEALTHY.color }]} />
          <Text style={styles.legendText}>Healthy (0-30)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SCORE_CATEGORIES.MODERATE.color }]} />
          <Text style={styles.legendText}>Moderate (31-50)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SCORE_CATEGORIES.UNHEALTHY.color }]} />
          <Text style={styles.legendText}>Unhealthy (51-70)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SCORE_CATEGORIES.SEVERE.color }]} />
          <Text style={styles.legendText}>Severe (71-100)</Text>
        </View>
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
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  scoreNumber: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scoreOutOf: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginRight: 4,
  },
  changePill: {
    backgroundColor: '#EDF5DC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#789938',
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSoft,
  },
  timePillActive: {
    backgroundColor: colors.darkButton,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timePillTextActive: {
    color: colors.white,
    fontWeight: '700',
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
    width: '75%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
});
