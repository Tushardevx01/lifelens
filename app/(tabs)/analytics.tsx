/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { analyticsApi, getDashboardData } from '@/src/services/api';
import type { DashboardData } from '@/src/features/dashboard/dashboard.types';
import type { LifeScoreHistoryPoint, CorrelationResponse } from '@/src/types/api.types';

import LifeScoreHero from '@/src/components/dashboard/LifeScoreHero';
import MetricGrid from '@/src/components/dashboard/MetricGrid';
import ScoreBreakdown from '@/src/components/dashboard/ScoreBreakdown';
import LifeScoreTrend from '@/src/components/dashboard/LifeScoreTrend';

const TIMEFRAMES = ['7D', '14D', '30D', '90D'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '7D': 7,
  '14D': 14,
  '30D': 30,
  '90D': 90,
};

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [timeframe, setTimeframe] = useState<Timeframe>('30D');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [historyPoints, setHistoryPoints] = useState<LifeScoreHistoryPoint[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    const days = TIMEFRAME_DAYS[timeframe];
    try {
      const [dash, history, corrs] = await Promise.all([
        getDashboardData(),
        analyticsApi.getLifeScoreHistory(days).catch(() => [] as LifeScoreHistoryPoint[]),
        analyticsApi.getCorrelations().catch(() => [] as CorrelationResponse[]),
      ]);
      setDashboardData(dash);
      setHistoryPoints(history || []);
      setCorrelations(corrs || []);
    } catch (err) {
      console.warn('[LifeLens] Failed to load analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const categories = (dashboardData?.scoreBreakdown || []).map((sb) => ({
    name: sb.category.charAt(0).toUpperCase() + sb.category.slice(1),
    score: sb.score,
    color: sb.color,
  }));

  // Build trend points from live API or fallback to dashboard trend data
  const trendPoints =
    historyPoints.length > 0
      ? historyPoints.map((pt) => ({
          day: pt.date.slice(5), // "MM-DD"
          life: pt.life_score,
          sleep: pt.sleep_score,
          productivity: pt.productivity_score,
        }))
      : (dashboardData?.trendData || []).map((t) => ({
          day: t.date.slice(5) || t.date,
          life: t.lifeScore,
          sleep: t.sleep,
          productivity: t.productivity,
        }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <View style={styles.timeframeRow}>
              {TIMEFRAMES.map((tf) => (
                <Pressable
                  key={tf}
                  style={[
                    styles.timeframeBtn,
                    timeframe === tf && styles.timeframeBtnActive,
                  ]}
                  onPress={() => setTimeframe(tf)}
                >
                  <Text
                    style={[
                      styles.timeframeText,
                      timeframe === tf && styles.timeframeTextActive,
                    ]}
                  >
                    {tf}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Deep performance telemetry, biometrics & category analytics
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading analytics telemetry...</Text>
          </View>
        ) : (
          <>
            {/* Life Score Hero Card */}
            {dashboardData?.lifeScore && (
              <LifeScoreHero
                score={dashboardData.lifeScore.overall}
                change={dashboardData.lifeScore.change}
              />
            )}

            {/* Metric Grid (4 Domain Cards) */}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Domain Breakdown</Text>
              <Text style={styles.sectionSubtitle}>Core life pillars evaluated</Text>
            </View>
            <MetricGrid />

            {/* Weighted Category Progress */}
            {categories.length > 0 && (
              <>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Weighted Scoring</Text>
                  <Text style={styles.sectionSubtitle}>Individual category impact</Text>
                </View>
                <ScoreBreakdown categories={categories} />
              </>
            )}

            {/* Multi-Metric Comparative Trend Chart */}
            {trendPoints.length > 0 && <LifeScoreTrend data={trendPoints} />}

            {/* Pearson Correlation Discoveries */}
            {correlations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Correlation Telemetry</Text>
                  <Text style={styles.sectionSubtitle}>Discovered habit couplings (r-coefficient)</Text>
                </View>
                <View style={styles.correlationsList}>
                  {correlations.slice(0, 4).map((c, idx) => (
                    <View key={idx} style={styles.corrCard}>
                      <View style={styles.corrTop}>
                        <Text style={styles.corrPair}>
                          {c.name_a} ↔ {c.name_b}
                        </Text>
                        <View
                          style={[
                            styles.rBadge,
                            { backgroundColor: c.r > 0 ? 'rgba(0, 212, 170, 0.15)' : 'rgba(255, 99, 109, 0.15)' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.rText,
                              { color: c.r > 0 ? colors.primary : colors.error },
                            ]}
                          >
                            r = {c.r.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.corrInsight}>{c.insight_message}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Deep Focus & Cognitive Diagnostics Card */}
            <View style={styles.diagnosticCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="flash-outline" size={20} color={colors.primary} />
                  <Text style={styles.cardTitle}>Cognitive & Focus Diagnostics</Text>
                </View>
                <View style={styles.efficiencyBadge}>
                  <Text style={styles.efficiencyText}>Optimal</Text>
                </View>
              </View>

              <View style={styles.diagGrid}>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>Deep Work</Text>
                  <Text style={styles.diagValue}>
                    {dashboardData?.lifeScore?.productivity != null
                      ? `${(dashboardData.lifeScore.productivity / 16).toFixed(1)} hrs`
                      : '5.5 hrs'}
                  </Text>
                  <Text style={styles.diagSub}>Daily target on track</Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>Focus Stability</Text>
                  <Text style={[styles.diagValue, { color: colors.cyan }]}>
                    {dashboardData?.lifeScore?.productivity != null
                      ? `${Math.round(dashboardData.lifeScore.productivity)}%`
                      : '94%'}
                  </Text>
                  <Text style={styles.diagSub}>Flow sustained</Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>Distraction Ratio</Text>
                  <Text style={[styles.diagValue, { color: colors.green }]}>Low</Text>
                  <Text style={styles.diagSub}>Within boundaries</Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>Habit Velocity</Text>
                  <Text style={[styles.diagValue, { color: colors.blue }]}>Top Tier</Text>
                  <Text style={styles.diagSub}>Consistency rising</Text>
                </View>
              </View>
            </View>

            {/* Biometrics & Recovery Card */}
            <View style={styles.diagnosticCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="pulse-outline" size={20} color={colors.red} />
                  <Text style={styles.cardTitle}>Recovery & Biometrics</Text>
                </View>
                <View style={[styles.efficiencyBadge, { backgroundColor: 'rgba(66, 215, 122, 0.15)' }]}>
                  <Text style={[styles.efficiencyText, { color: colors.green }]}>Active</Text>
                </View>
              </View>

              <View style={styles.diagGrid}>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>Sleep Index</Text>
                  <Text style={[styles.diagValue, { color: colors.primary }]}>
                    {dashboardData?.lifeScore?.sleep != null
                      ? `${Math.round(dashboardData.lifeScore.sleep)}%`
                      : '85%'}
                  </Text>
                  <Text style={styles.diagSub}>Recovery efficiency</Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>Health Index</Text>
                  <Text style={[styles.diagValue, { color: colors.cyan }]}>
                    {dashboardData?.lifeScore?.health != null
                      ? `${Math.round(dashboardData.lifeScore.health)}%`
                      : '80%'}
                  </Text>
                  <Text style={styles.diagSub}>Movement foundation</Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>Finance Index</Text>
                  <Text style={[styles.diagValue, { color: colors.orange }]}>
                    {dashboardData?.lifeScore?.finance != null
                      ? `${Math.round(dashboardData.lifeScore.finance)}%`
                      : '90%'}
                  </Text>
                  <Text style={styles.diagSub}>Budget discipline</Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>Net Adjustment</Text>
                  <Text style={[styles.diagValue, { color: colors.blue }]}>
                    {dashboardData?.lifeScore?.change != null
                      ? `${dashboardData.lifeScore.change >= 0 ? '+' : ''}${dashboardData.lifeScore.change.toFixed(1)}`
                      : '+1.5'}
                  </Text>
                  <Text style={styles.diagSub}>vs Yesterday</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timeframeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeframeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  timeframeBtnActive: {
    backgroundColor: colors.primary,
  },
  timeframeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  timeframeTextActive: {
    color: colors.background,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sectionTitleRow: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.md,
  },
  correlationsList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  corrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  corrTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  corrPair: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  rText: {
    fontSize: 11,
    fontWeight: '800',
  },
  corrInsight: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  diagnosticCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  efficiencyBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  efficiencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  diagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  diagItem: {
    width: '45%',
    gap: 2,
  },
  diagLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  diagValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  diagSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
