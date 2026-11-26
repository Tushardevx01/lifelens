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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { CONFIG } from '@/src/config';
import { getDashboardData, experimentsApi } from '@/src/services/api';
import type { DashboardData } from '@/src/features/dashboard/dashboard.types';
import type { ExperimentCreate, ActiveExperimentProgress } from '@/src/types/api.types';

import LifeScoreHero from '@/src/components/dashboard/LifeScoreHero';
import InsightCard from '@/src/components/dashboard/InsightCard';
import InsightsList from '@/src/components/dashboard/InsightsList';
import {
  ExperimentModal,
  ActiveExperimentCard,
  ExperimentHubModal,
  ExperimentEvaluationModal,
} from '@/src/components/experiments';
import { ChatModal } from '@/src/components/assistant';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeExperiments, setActiveExperiments] = useState<ActiveExperimentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [experimentInitialData, setExperimentInitialData] = useState<Partial<ExperimentCreate> | undefined>(undefined);
  const [showHubModal, setShowHubModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);

  const fetchInsights = useCallback(async () => {
    try {
      const [fetched, active] = await Promise.all([
        getDashboardData(),
        experimentsApi.getActive().catch(() => [] as ActiveExperimentProgress[]),
      ]);
      setData(fetched);
      setActiveExperiments(active || []);
    } catch (err) {
      console.warn('[LifeLens] Failed to fetch live insights:', err);
      Alert.alert(
        'Backend Not Running',
        `Without backend, no entry.\n\nCould not fetch insights telemetry from ${CONFIG.API_URL}.\n\nPlease ensure the backend server is running.`,
        [{ text: 'Retry', onPress: () => fetchInsights() }]
      );
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.darkButton}
            colors={[colors.darkButton]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Insights</Text>
            <View style={styles.headerActionRow}>
              <Pressable
                style={styles.trialsBadge}
                onPress={() => setShowHubModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Open Experiment Hub"
              >
                <Ionicons name="flask" size={14} color="#1D4ED8" />
                <Text style={styles.trialsBadgeText}>Trials</Text>
              </Pressable>
              <Pressable
                style={styles.aiBadge}
                onPress={() => {
                  setChatInitialPrompt(undefined);
                  setShowChatModal(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Chat with LifeLens AI"
              >
                <Ionicons name="sparkles" size={14} color="#66300C" />
                <Text style={styles.aiBadgeText}>Ask AI</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Your daily life score, scientific n-of-1 trials and actionable patterns.
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.darkButton} />
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

            {/* Active N-of-1 Clinical Interventions */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderBetween}>
                <View>
                  <Text style={styles.sectionTitle}>Behavioral Experiments</Text>
                  <Text style={styles.sectionSubtitle}>
                    {activeExperiments.length > 0
                      ? 'Daily adherence check-in & statistical hypothesis testing'
                      : 'Test lifestyle protocols with clinical n-of-1 rigour'}
                  </Text>
                </View>
                <Pressable
                  style={styles.hubLinkPill}
                  onPress={() => setShowHubModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Browse Experiment Hub"
                >
                  <Ionicons name="flask-outline" size={13} color={colors.darkButton} />
                  <Text style={styles.hubLinkText}>Hub ({activeExperiments.length})</Text>
                </Pressable>
              </View>

              {activeExperiments.length > 0 ? (
                activeExperiments.map((progress) => (
                  <View key={progress.experiment.id} style={{ marginBottom: spacing.sm }}>
                    <ActiveExperimentCard
                      progress={progress}
                      onRefresh={fetchInsights}
                      onViewEvaluation={(expId) => {
                        setSelectedEvalId(expId);
                        setShowEvalModal(true);
                      }}
                    />
                  </View>
                ))
              ) : (
                <Pressable
                  style={styles.startExperimentBanner}
                  onPress={() => setShowHubModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Launch your first lifestyle trial"
                >
                  <View style={styles.bannerIconWrap}>
                    <Ionicons name="flask" size={20} color="#1D4ED8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>Launch an N-of-1 Clinical Trial</Text>
                    <Text style={styles.bannerSub}>
                      Browse scientifically vetted protocols (e.g. 10 PM Screen Curfew, Cold Shower) to test what truly moves your Life Score.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

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

      <ExperimentHubModal
        visible={showHubModal}
        onClose={() => setShowHubModal(false)}
        onOpenCreate={(initial) => {
          setShowHubModal(false);
          setExperimentInitialData(initial);
          setShowExperimentModal(true);
        }}
        onOpenEvaluation={(expId) => {
          setShowHubModal(false);
          setSelectedEvalId(expId);
          setShowEvalModal(true);
        }}
      />

      <ExperimentEvaluationModal
        visible={showEvalModal}
        experimentId={selectedEvalId}
        onClose={() => {
          setShowEvalModal(false);
          setSelectedEvalId(null);
        }}
        onSuccess={() => {
          setShowEvalModal(false);
          setSelectedEvalId(null);
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
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryText,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trialsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  trialsBadgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEAE0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#F8D2BD',
  },
  aiBadgeText: {
    color: '#66300C',
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
    color: colors.secondaryText,
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
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  hubLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hubLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.darkButton,
  },
  startExperimentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  bannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  bannerSub: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 16,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryText,
  },
});
