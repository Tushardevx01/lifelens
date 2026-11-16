/**
 * MetricGrid – LifeLens Dashboard Component
 *
 * 2-column grid of compact metric cards (Sleep, Productivity, Health, Finance).
 * Each card shows a real score number and a circular indicator.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius }  from '@/src/theme/radius';
import CircularProgress from './CircularProgress';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { getScoreClassification } from '@/src/utils/scoreClassification';

interface Metric {
  name:  string;
  score: number;
  color: string;
}

interface MetricGridProps {
  metrics?: Metric[];
}

export default function MetricGrid({ metrics = [] }: MetricGridProps) {
  if (metrics.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No domain telemetry recorded yet. Log your first daily entry to generate scores.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {metrics.map((metric) => {
        const hasScore = typeof metric.score === 'number' && metric.score > 0;
        const classification = getScoreClassification(hasScore ? metric.score : null);
        const scoreColor = hasScore ? classification.color : colors.textMuted;

        return (
          <View key={metric.name} style={styles.card}>
            {/* Name + ring */}
            <View style={styles.topRow}>
              <Text style={styles.name}>{metric.name}</Text>
              <CircularProgress
                size={36}
                progress={hasScore ? metric.score : 0}
                color={scoreColor}
                strokeWidth={4}
                backgroundColor={colors.surfaceSecondary}
              />
            </View>

            {/* Large number */}
            <View style={styles.scoreRow}>
              <Text style={[styles.score, { color: scoreColor }]}>
                {hasScore ? Math.round(metric.score) : '--'}
              </Text>
              <Text style={styles.unit}>/100</Text>
            </View>

            {hasScore ? (
              <ScoreBadge score={metric.score} size="xs" style={{ marginTop: 6 }} />
            ) : (
              <Text style={styles.notLoggedText}>Not logged yet</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom:  spacing.md,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    width:            '47.5%',
    backgroundColor:  colors.surface,
    borderRadius:     radius.xl,
    padding:          spacing.lg,
    borderWidth:      1,
    borderColor:      colors.border,
    shadowColor:      colors.shadowWarm,
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.04,
    shadowRadius:     6,
    elevation:        1,
  },
  topRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.md,
  },
  name: {
    fontSize:   14,
    fontWeight: '700',
    color:      colors.primaryText,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
  },
  score: {
    fontSize:   26,
    fontWeight: '800',
  },
  unit: {
    fontSize:   11,
    color:      colors.secondaryText,
    marginLeft: 3,
    fontWeight: '600',
  },
  notLoggedText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
});
