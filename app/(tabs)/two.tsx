import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { mockDashboardData } from '@/src/features/dashboard';

import LifeScoreHero from '@/src/components/dashboard/LifeScoreHero';
import MetricGrid from '@/src/components/dashboard/MetricGrid';
import ScoreBreakdown from '@/src/components/dashboard/ScoreBreakdown';
import LifeScoreTrend from '@/src/components/dashboard/LifeScoreTrend';

const TIMEFRAMES = ['7D', '14D', '30D', '90D'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [timeframe, setTimeframe] = useState<Timeframe>('30D');

  const categories = (mockDashboardData.scoreBreakdown || []).map((sb) => ({
    name: sb.category.charAt(0).toUpperCase() + sb.category.slice(1),
    score: sb.score,
    color: sb.color,
  }));

  const trendPoints = [
    { day: 'Mon', life: 78, sleep: 80, productivity: 75 },
    { day: 'Tue', life: 82, sleep: 85, productivity: 80 },
    { day: 'Wed', life: 76, sleep: 78, productivity: 72 },
    { day: 'Thu', life: 88, sleep: 90, productivity: 85 },
    { day: 'Fri', life: 81, sleep: 82, productivity: 86 },
    { day: 'Sat', life: 83, sleep: 87, productivity: 82 },
    { day: 'Sun', life: 84.5, sleep: 88, productivity: 85 },
  ];

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

        {/* Life Score Hero Card */}
        <LifeScoreHero
          score={mockDashboardData.lifeScore.overall}
          change={mockDashboardData.lifeScore.change}
        />

        {/* Metric Grid (4 Domain Cards) */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Domain Breakdown</Text>
          <Text style={styles.sectionSubtitle}>Core life pillars evaluated</Text>
        </View>
        <MetricGrid />

        {/* Weighted Category Progress */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Weighted Scoring</Text>
          <Text style={styles.sectionSubtitle}>Individual category impact</Text>
        </View>
        <ScoreBreakdown categories={categories} />

        {/* Multi-Metric Comparative Trend Chart */}
        <LifeScoreTrend data={trendPoints} />

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
              <Text style={styles.diagValue}>5.5 hrs</Text>
              <Text style={styles.diagSub}>+37% vs target</Text>
            </View>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Focus Stability</Text>
              <Text style={[styles.diagValue, { color: colors.cyan }]}>94%</Text>
              <Text style={styles.diagSub}>Flow sustained</Text>
            </View>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Distraction Ratio</Text>
              <Text style={[styles.diagValue, { color: colors.green }]}>12%</Text>
              <Text style={styles.diagSub}>Low interruption</Text>
            </View>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Habit Velocity</Text>
              <Text style={[styles.diagValue, { color: colors.blue }]}>9.4</Text>
              <Text style={styles.diagSub}>Top percentile</Text>
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
              <Text style={[styles.efficiencyText, { color: colors.green }]}>Synced</Text>
            </View>
          </View>

          <View style={styles.diagGrid}>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Resting Heart Rate</Text>
              <Text style={styles.diagValue}>58 bpm</Text>
              <Text style={styles.diagSub}>Athletic baseline</Text>
            </View>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Sleep Duration</Text>
              <Text style={[styles.diagValue, { color: colors.primary }]}>8.1 hrs</Text>
              <Text style={styles.diagSub}>100% sleep goal</Text>
            </View>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Deep / REM Ratio</Text>
              <Text style={[styles.diagValue, { color: colors.blue }]}>42%</Text>
              <Text style={styles.diagSub}>High rejuvenation</Text>
            </View>
            <View style={styles.diagItem}>
              <Text style={styles.diagLabel}>Daily Activity</Text>
              <Text style={[styles.diagValue, { color: colors.orange }]}>8,900</Text>
              <Text style={styles.diagSub}>Steps recorded</Text>
            </View>
          </View>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timeframeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  timeframeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  timeframeBtnActive: {
    backgroundColor: colors.surfaceElevated,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  timeframeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sectionTitleRow: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
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
  diagnosticCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  efficiencyBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.25)',
  },
  efficiencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  diagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  diagItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  diagLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  diagValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  diagSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
