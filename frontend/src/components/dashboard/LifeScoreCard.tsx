import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { getScoreClassification } from '@/src/utils/scoreClassification';

interface CategoryScore {
  name: string;
  score: number;
  color: string;
}

interface LifeScoreCardProps {
  score: number;
  change: number;
  categories?: CategoryScore[];
}

export default function LifeScoreCard({
  score,
  change,
  categories = [],
}: LifeScoreCardProps) {
  const hasScore = typeof score === 'number' && !isNaN(score) && score > 0;
  const overallClassification = getScoreClassification(hasScore ? score : null);
  const scoreColor = hasScore ? overallClassification.color : colors.textMuted;

  return (
    <View style={styles.card}>
      <Text style={styles.headerLabel}>DAILY LIFE SCORE</Text>

      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { color: scoreColor }]}>
          {hasScore ? score.toFixed(1) : '--'}
        </Text>
        <Text style={styles.divider}>/100</Text>
      </View>

      {/* Health Category Badge */}
      <View style={styles.categoryBadgeWrap}>
        {hasScore ? (
          <ScoreBadge score={score} size="md" />
        ) : (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Pending Today's Logs</Text>
          </View>
        )}
      </View>

      <View style={styles.changeBadgeWrap}>
        {hasScore && Math.abs(change) > 0 ? (
          <View style={[styles.changeBadge, change >= 0 ? styles.positiveBadge : styles.negativeBadge]}>
            <Text style={[styles.changeText, change >= 0 ? styles.positiveText : styles.negativeText]}>
              {change >= 0 ? '↑ +' : '↓ '}
              {Math.abs(change).toFixed(1)} pts vs yesterday
            </Text>
          </View>
        ) : (
          <Text style={styles.baselineText}>
            {hasScore ? 'Baseline maintained' : 'Log metrics to project score'}
          </Text>
        )}
      </View>

      {categories.length > 0 && (
        <View style={styles.categoriesGrid}>
          {categories.map((cat) => {
            const hasCatScore = typeof cat.score === 'number' && cat.score > 0;
            const catClass = getScoreClassification(hasCatScore ? cat.score : null);
            const catColor = hasCatScore ? catClass.color : colors.textMuted;
            return (
              <View key={cat.name} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.dot, { backgroundColor: catColor }]} />
                  <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                </View>
                <Text style={[styles.categoryScore, { color: catColor }]}>
                  {hasCatScore ? Math.round(cat.score) : '--'}
                </Text>
                {hasCatScore ? (
                  <ScoreBadge score={cat.score} size="xs" style={{ marginTop: 2 }} />
                ) : (
                  <Text style={styles.emptyCatText}>--</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
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
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    boxShadow: '0px 4px 16px rgba(102, 48, 12, 0.04)',
    elevation: 3,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  categoryBadgeWrap: {
    marginBottom: spacing.sm,
  },
  score: {
    fontSize: 54,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  divider: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 4,
  },
  changeBadgeWrap: {
    marginBottom: spacing.md,
  },
  changeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  positiveBadge: {
    backgroundColor: '#EDF5DC',
  },
  negativeBadge: {
    backgroundColor: '#FCE3E3',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  positiveText: {
    color: '#789938',
  },
  negativeText: {
    color: '#A84545',
  },
  categoriesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  categoryItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryScore: {
    fontSize: 15,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  baselineText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  emptyCatText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
});
