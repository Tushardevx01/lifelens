/**
 * TrendCard – LifeLens Dashboard Component
 *
 * Warm, minimal score trend with pill-style time filters, clean bar chart,
 * and score classification health indicators.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius }  from '@/src/theme/radius';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { getScoreClassification, SCORE_CATEGORIES } from '@/src/utils/scoreClassification';
import {
  formatAxisDate,
  getMilestoneLabels,
  sliceTrendData,
} from '@/src/utils/trendChart';

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
type Timeframe = (typeof TIMEFRAMES)[number];

export default function TrendCard({
  data         = [],
  latestScore  = 0,
  monthChange  = '0%',
}: TrendCardProps) {
  const [selected, setSelected] = useState<Timeframe>('30D');
  const maxVal = 100;
  const chartH = 88;

  const visibleData = useMemo(() => sliceTrendData(data, selected), [data, selected]);

  const displayScore =
    latestScore > 0
      ? latestScore
      : (visibleData.length > 0 ? visibleData[visibleData.length - 1].value : 0);
  const hasScore = displayScore > 0;
  const latestClass = getScoreClassification(displayScore);
  const showAllBarLabels = visibleData.length <= 7;

  const milestoneLabels = useMemo(
    () => getMilestoneLabels(visibleData.map((pt) => pt.day)),
    [visibleData]
  );

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
              {hasScore ? displayScore.toFixed(1) : '—'}
            </Text>
            <Text style={styles.scoreOutOf}>/100</Text>
            {hasScore && <ScoreBadge score={displayScore} size="sm" />}
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

      {/* Bar plot box — strictly bounded height so bars never bleed into header or axis */}
      <View
        style={[
          styles.barsArea,
          {
            height: chartH,
            gap: visibleData.length > 14 ? 2 : spacing.xs,
          },
        ]}
      >
        {visibleData.map((point, i) => {
          const clamped = Math.max(0, Math.min(maxVal, point.value || 0));
          const barH = Math.max(4, (clamped / maxVal) * chartH);
          const pointClass = getScoreClassification(clamped);
          return (
            <View key={`${point.day}-${i}`} style={[styles.barTrack, { height: chartH }]}>
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
          );
        })}
      </View>

      {/* X-axis labels cleanly placed below baseline */}
      {showAllBarLabels ? (
        <View
          style={[
            styles.xAxisPerBarRow,
            { gap: visibleData.length > 14 ? 2 : spacing.xs },
          ]}
        >
          {visibleData.map((point, i) => (
            <Text
              key={`lbl-${point.day}-${i}`}
              style={styles.dayLabel}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {formatAxisDate(point.day, true)}
            </Text>
          ))}
        </View>
      ) : (
        <View style={styles.xAxisMilestoneRow}>
          {milestoneLabels.map((lbl, idx) => (
            <Text key={`ms-${idx}`} style={styles.milestoneLabel} numberOfLines={1}>
              {lbl}
            </Text>
          ))}
        </View>
      )}

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
    overflow: 'hidden',
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
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSoft,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
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
  barsArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '78%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    minHeight: 4,
  },
  xAxisPerBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  dayLabel: {
    flex: 1,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  xAxisMilestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  milestoneLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.md,
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
