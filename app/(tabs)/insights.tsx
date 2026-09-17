import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { mockDashboardData } from '@/src/features/dashboard';

import InsightCard from '@/src/components/dashboard/InsightCard';
import ProductivityPrediction from '@/src/components/dashboard/ProductivityPrediction';
import InsightsList from '@/src/components/dashboard/InsightsList';
import BehaviouralClusters from '@/src/components/dashboard/BehaviouralClusters';
import CorrelationCards from '@/src/components/dashboard/CorrelationCards';
import AnomalyAlerts from '@/src/components/dashboard/AnomalyAlerts';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const data = mockDashboardData;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
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
        </View>

        {/* Featured Daily Insight */}
        {data.insight && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daily Synthesis</Text>
            </View>
            <InsightCard
              title={data.insight.title}
              summary={data.insight.summary}
              whyItMatters={data.insight.whyItMatters}
              action={data.insight.actionForToday}
            />
          </View>
        )}

        {/* Discover Patterns & Correlations */}
        {data.correlations && data.correlations.length > 0 && (
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
        {data.prediction && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Predictive Forecast</Text>
              <Text style={styles.sectionSubtitle}>
                Tomorrow's predicted focus & driver
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
        {data.clusters && data.clusters.length > 0 && (
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
        {data.insights && data.insights.length > 0 && (
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
        {data.anomalies && data.anomalies.length > 0 && (
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
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
