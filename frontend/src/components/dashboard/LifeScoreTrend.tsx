import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { getScoreClassification, SCORE_CATEGORIES } from '@/src/utils/scoreClassification';

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

export default function LifeScoreTrend({ data = [] }: LifeScoreTrendProps) {
  const [selected, setSelected] = useState<string>('7d');
  const maxScore = 100;

  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>30-Day Life Score Trend</Text>
        <Text style={styles.emptyText}>
          No trend telemetry recorded yet. Continue logging daily entries to visualize your multidimensional trends.
        </Text>
      </View>
    );
  }

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

          const lifeColor = getScoreClassification(point.life).color;
          const sleepColor = getScoreClassification(point.sleep).color;
          const prodColor = getScoreClassification(point.productivity).color;

          return (
            <View key={i} style={styles.barGroup}>
              <View style={styles.bars}>
                <View style={[styles.bar, { height: lifeHeight, backgroundColor: lifeColor }]} />
                <View style={[styles.bar, { height: sleepHeight, backgroundColor: sleepColor }]} />
                <View style={[styles.bar, { height: prodHeight, backgroundColor: prodColor }]} />
              </View>
              <Text style={styles.dayLabel}>{point.day}</Text>
            </View>
          );
        })}
      </View>

      {/* Metric Categories & Health Tier Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legend}>
          <Text style={styles.legendHeader}>METRIC BARS (L → R):</Text>
          <View style={styles.legendRow}>
            <Text style={styles.legendSubtext}>Bar 1: Life</Text>
            <Text style={styles.legendSubtext}>Bar 2: Sleep</Text>
            <Text style={styles.legendSubtext}>Bar 3: Productivity</Text>
          </View>
        </View>

        <View style={styles.healthLegendRow}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
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
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSoft,
  },
  timeframeActive: {
    backgroundColor: colors.darkButton,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  timeframeTextActive: {
    color: colors.white,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginBottom: spacing.md,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 6,
    borderRadius: radius.xs,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  legendContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  legend: {
    marginBottom: 4,
  },
  legendHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  healthLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 4,
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
