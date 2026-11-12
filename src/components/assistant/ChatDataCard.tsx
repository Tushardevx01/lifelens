import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { typography } from '@/src/theme/typography';
import type { ChatCardPayload } from '@/src/types/api.types';

interface ChatDataCardProps {
  card: ChatCardPayload;
}

export function ChatDataCard({ card }: ChatDataCardProps) {
  const { card_type, title } = card;
  // card.data is a dynamic JSON payload originating from LLM tool-calling responses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = card.data as Record<string, any>;

  switch (card_type) {
    case 'sleep_analysis':
      return (
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(93, 169, 255, 0.15)' }]}>
              <Ionicons name="moon" size={16} color={colors.blue} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{data.avg_sleep_hours ?? 0}h</Text>
              <Text style={styles.metricLbl}>Avg Sleep</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{data.avg_quality ?? 0}/10</Text>
              <Text style={styles.metricLbl}>Quality</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>±{data.bedtime_variance_min ?? 0}m</Text>
              <Text style={styles.metricLbl}>Bedtime Var</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{data.late_night_sessions ?? 0}</Text>
              <Text style={styles.metricLbl}>Late Night</Text>
            </View>
          </View>

          {data.correlation_note ? (
            <View style={styles.highlightPill}>
              <Ionicons name="git-branch-outline" size={13} color={colors.primary} />
              <Text style={styles.highlightText}>{data.correlation_note}</Text>
            </View>
          ) : null}
        </View>
      );

    case 'spending_breakdown':
      return (
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(255, 179, 71, 0.15)' }]}>
              <Ionicons name="wallet" size={16} color={colors.orange} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.orange }]}>
                ₹{Number(data.total_spend ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.metricLbl}>Total Outflow</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{data.discretionary_ratio_pct ?? 0}%</Text>
              <Text style={styles.metricLbl}>Discretionary</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>₹{Number(data.discretionary_spend ?? 0).toLocaleString()}</Text>
              <Text style={styles.metricLbl}>Wants / Fun</Text>
            </View>
          </View>

          {Array.isArray(data.top_categories) && data.top_categories.length > 0 ? (
            <View style={styles.categoriesSection}>
              <Text style={styles.subSectionTitle}>Top Categories</Text>
              {data.top_categories.slice(0, 3).map((c: { category: string; pct: number; amount: number }, i: number) => (
                <View key={i} style={styles.categoryRow}>
                  <Text style={styles.categoryName}>{c.category}</Text>
                  <View style={styles.categoryBarWrap}>
                    <View style={[styles.categoryBarFill, { width: `${Math.min(100, c.pct || 0)}%` }]} />
                  </View>
                  <Text style={styles.categoryAmount}>₹{c.amount} ({c.pct}%)</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      );

    case 'productivity_patterns':
      return (
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(184, 255, 61, 0.15)' }]}>
              <Ionicons name="flash" size={16} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.primary }]}>{data.avg_deep_work_hours ?? 0}h</Text>
              <Text style={styles.metricLbl}>Deep Work/Day</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{data.distraction_rate_per_hour ?? 0}/h</Text>
              <Text style={styles.metricLbl}>Distractions</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{data.avg_focus_rating ?? 0}/5</Text>
              <Text style={styles.metricLbl}>Focus Rating</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{data.avg_tasks_completed ?? 0}</Text>
              <Text style={styles.metricLbl}>Tasks/Day</Text>
            </View>
          </View>
        </View>
      );

    case 'active_experiment':
      return (
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(167, 123, 255, 0.15)' }]}>
              <Ionicons name="flask" size={16} color={colors.purple} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <View style={[styles.statusPill, { backgroundColor: data.status === 'ACTIVE' ? 'rgba(66, 215, 122, 0.15)' : 'rgba(255, 255, 255, 0.1)' }]}>
              <Text style={[styles.statusPillText, { color: data.status === 'ACTIVE' ? colors.green : colors.textSecondary }]}>
                {data.status}
              </Text>
            </View>
          </View>

          <Text style={styles.hypothesisText} numberOfLines={2}>
            &ldquo;{data.hypothesis}&rdquo;
          </Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{data.adherence_rate_pct ?? 0}%</Text>
              <Text style={styles.metricLbl}>Adherence ({data.days_completed}/{data.duration_days}d)</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: (data.outcome_delta ?? 0) >= 0 ? colors.green : colors.red }]}>
                {(data.outcome_delta ?? 0) > 0 ? '+' : ''}{data.outcome_delta ?? '0.00'}
              </Text>
              <Text style={styles.metricLbl}>Delta ({data.desired_direction})</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{data.outcome_verdict ?? 'PENDING'}</Text>
              <Text style={styles.metricLbl}>Verdict</Text>
            </View>
          </View>
        </View>
      );

    case 'lifescore_overview':
      return (
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(184, 255, 61, 0.15)' }]}>
              <Ionicons name="trending-up" size={16} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.cyan }]}>{data.sleep_score ?? 0}</Text>
              <Text style={styles.metricLbl}>Sleep</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.blue }]}>{data.productivity_score ?? 0}</Text>
              <Text style={styles.metricLbl}>Productivity</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.primary }]}>{data.health_score ?? 0}</Text>
              <Text style={styles.metricLbl}>Health</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.orange }]}>{data.finance_score ?? 0}</Text>
              <Text style={styles.metricLbl}>Finance</Text>
            </View>
          </View>
        </View>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hypothesisText: {
    ...typography.secondary,
    color: colors.secondaryText,
    fontStyle: 'italic',
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  metricVal: {
    ...typography.metricNumberSm,
    fontSize: 14,
    color: colors.primaryText,
    fontWeight: '700',
  },
  metricLbl: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAE0',
    borderRadius: radius.md,
    padding: spacing.xs,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#F8D2BD',
  },
  highlightText: {
    ...typography.caption,
    color: '#66300C',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
    flex: 1,
  },
  categoriesSection: {
    marginTop: spacing.sm,
  },
  subSectionTitle: {
    ...typography.caption,
    color: colors.secondaryText,
    marginBottom: spacing.xxs,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  categoryName: {
    ...typography.secondary,
    fontSize: 11,
    color: colors.secondaryText,
    width: 80,
  },
  categoryBarWrap: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.full,
    marginHorizontal: spacing.xs,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  categoryAmount: {
    ...typography.secondary,
    fontSize: 10,
    color: colors.primaryText,
    fontWeight: '600',
    width: 80,
    textAlign: 'right',
  },
});
