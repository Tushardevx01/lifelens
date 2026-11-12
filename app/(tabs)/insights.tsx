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
import type { ExperimentCreate } from '@/src/types/api.types';

import LifeScoreHero from '@/src/components/dashboard/LifeScoreHero';
import InsightCard from '@/src/components/dashboard/InsightCard';
import InsightsList from '@/src/components/dashboard/InsightsList';
import { ExperimentModal } from '@/src/components/experiments';
import { ChatModal } from '@/src/components/assistant';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [experimentInitialData, setExperimentInitialData] = useState<Partial<ExperimentCreate> | undefined>(undefined);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);

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
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Insights</Text>
            <Pressable
              style={styles.aiBadge}
              onPress={() => {
                setChatInitialPrompt(undefined);
                setShowChatModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Chat with LifeLens AI"
            >
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={styles.aiBadgeText}>Ask AI</Text>
            </Pressable>
          </View>
          <Text style={styles.headerSubtitle}>
            Your daily life score and actionable patterns.
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !data ? (
          <View style={styles.emptyContainer}>
            <Text>No insights available.</Text>
          </View>
        ) : (
          <>
            {/* Life Score Hero */}
            {data.lifeScore && (
              <View style={styles.section}>
                <LifeScoreHero
                  score={data.lifeScore.overall}
                  change={data.lifeScore.change}
                />
              </View>
            )}

            {/* Featured Daily Insight */}
            {data.insight && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Today's Focus</Text>
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

            {/* Actionable Takeaways */}
            {data.insights && data.insights.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recommendations</Text>
                </View>
                <InsightsList insights={data.insights} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ExperimentModal
        visible={showExperimentModal}
        onClose={() => {
          setShowExperimentModal(false);
          setExperimentInitialData(undefined);
        }}
        initialData={experimentInitialData}
        onSuccess={() => {
          fetchInsights();
        }}
      />

      <ChatModal
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        initialPrompt={chatInitialPrompt}
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
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
