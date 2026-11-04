/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { getDashboardData } from '@/src/services/api';
import type { DashboardData } from '@/src/features/dashboard/dashboard.types';

import InsightCard from '@/src/components/dashboard/InsightCard';
import ProductivityPrediction from '@/src/components/dashboard/ProductivityPrediction';
import InsightsList from '@/src/components/dashboard/InsightsList';
import BehaviouralClusters from '@/src/components/dashboard/BehaviouralClusters';
import CorrelationCards from '@/src/components/dashboard/CorrelationCards';
import AnomalyAlerts from '@/src/components/dashboard/AnomalyAlerts';
import { ExperimentModal } from '@/src/components/experiments';

type InsightFilter = 'All' | 'Correlations' | 'Forecast' | 'Clusters' | 'Alerts';
const FILTERS: InsightFilter[] = ['All', 'Correlations', 'Forecast', 'Clusters', 'Alerts'];

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<InsightFilter>('All');
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [experimentInitialData, setExperimentInitialData] = useState<any>(null);

  const fetchInsights = useCallback(async () => {
    try {
      const fetched = await getDashboardData();
      setData(fetched);
    } catch (err) {
      console.warn('[LifeLens] Failed to fetch live insights:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  const showAll = filter === 'All';
  const showCorrelations = showAll || filter === 'Correlations';
  const showForecast = showAll || filter === 'Forecast';
  const showClusters = showAll || filter === 'Clusters';
  const showAlerts = showAll || filter === 'Alerts';

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Insights</Text>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={styles.aiBadgeText}>AI Engine</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Discover patterns, behavioral clusters & predictive intelligence
          </Text>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTrack}
          >
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterPill,
                  filter === f && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === f && styles.filterTextActive,
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Synthesizing machine learning insights...</Text>
          </View>
        ) : !data ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bulb-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Insights Generating</Text>
            <Text style={styles.emptySubtitle}>
              Log daily entries to build your behavioral history and unlock deeper insights.
            </Text>
          </View>
        ) : (
          <>
            {/* Featured Daily Insight */}
            {data.insight && (showAll || filter === 'Forecast') && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Daily Synthesis</Text>
                </View>
                <InsightCard
                  title={data.insight.title}
                  summary={data.insight.summary}
                  whyItMatters={data.insight.whyItMatters}
                  action={data.insight.actionForToday}
                  onStartExperiment={(insight) => {
                    setExperimentInitialData({
                      title: `Test: ${insight.title}`,
                      hypothesis: insight.summary,
                      intervention_rule: insight.action,
                      target_metric: 'sleep_hours',
                    });
                    setShowExperimentModal(true);
                  }}
                />
              </View>
            )}

            {/* Discover Patterns & Correlations */}
            {showCorrelations && data.correlations && data.correlations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Discover Patterns</Text>
                  <Text style={styles.sectionSubtitle}>
                    Cross-domain correlation discoveries
                  </Text>
                </View>
                <CorrelationCards correlations={data.correlations} />
              </View>
            )}

            {/* Tomorrow's Productivity Forecast */}
            {showForecast && data.prediction && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Predictive Forecast</Text>
                  <Text style={styles.sectionSubtitle}>
                    Tomorrow's predicted focus & key driver
                  </Text>
                </View>
                <ProductivityPrediction
                  predictedScore={data.prediction.score}
                  keyDriver={data.prediction.keyDriver}
                  recommendation={data.prediction.recommendation}
                />
              </View>
            )}

            {/* Behavioral Clusters */}
            {showClusters && data.clusters && data.clusters.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Behavioral Clusters</Text>
                  <Text style={styles.sectionSubtitle}>
                    Archetypes identified across your routine
                  </Text>
                </View>
                <BehaviouralClusters clusters={data.clusters} />
              </View>
            )}

            {/* Actionable Takeaways */}
            {showAll && data.insights && data.insights.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Actionable Intelligence</Text>
                  <Text style={styles.sectionSubtitle}>
                    Recommended habit optimizations
                  </Text>
                </View>
                <InsightsList insights={data.insights} />
              </View>
            )}

            {/* Anomaly Alerts */}
            {showAlerts && data.anomalies && data.anomalies.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pattern Anomalies</Text>
                  <Text style={styles.sectionSubtitle}>
                    Irregular deviations from your baseline
                  </Text>
                </View>
                <AnomalyAlerts alerts={data.anomalies} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ExperimentModal
        visible={showExperimentModal}
        onClose={() => {
          setShowExperimentModal(false);
          setExperimentInitialData(null);
        }}
        initialData={experimentInitialData}
        onSuccess={() => {
          fetchInsights();
        }}
      />
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
    paddingHorizontal: spacing.lg,
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
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.25)',
  },
  aiBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  filterTrack: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: '700',
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
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
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
});
