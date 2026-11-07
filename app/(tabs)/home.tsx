import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, Pressable, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { DashboardData } from '@/src/features/dashboard/dashboard.types';
import { getDashboardData } from '@/src/services/api';

import DashboardHeader from '@/src/components/dashboard/DashboardHeader';
import InsightCard from '@/src/components/dashboard/InsightCard';
import LifeScoreCard from '@/src/components/dashboard/LifeScoreCard';
import ScoreBreakdown from '@/src/components/dashboard/ScoreBreakdown';
import TrendCard from '@/src/components/dashboard/TrendCard';
import ProductivityPrediction from '@/src/components/dashboard/ProductivityPrediction';
import InsightsList from '@/src/components/dashboard/InsightsList';
import BehaviouralClusters from '@/src/components/dashboard/BehaviouralClusters';
import CorrelationCards from '@/src/components/dashboard/CorrelationCards';
import AnomalyAlerts from '@/src/components/dashboard/AnomalyAlerts';
import { TransactionModal, FocusTimerModal, HabitsMatrix } from '@/src/components/telemetry';
import {
  ActiveExperimentCard,
  ExperimentModal,
  ExperimentEvaluationModal,
  ExperimentHubModal,
} from '@/src/components/experiments';
import { experimentsApi } from '@/src/services/api';
import type { ActiveExperimentProgress } from '@/src/types/api.types';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showCreateExperiment, setShowCreateExperiment] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showExperimentHub, setShowExperimentHub] = useState(false);
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [createInitialData, setCreateInitialData] = useState<any>(null);
  const [activeExperiments, setActiveExperiments] = useState<ActiveExperimentProgress[]>([]);

  const fetchActiveExperiments = async () => {
    try {
      const active = await experimentsApi.getActive();
      setActiveExperiments(active);
    } catch {
      // Handled gracefully
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [fetchedData] = await Promise.all([
          getDashboardData(),
          fetchActiveExperiments(),
        ]);
        setData(fetchedData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={{ color: colors.error, marginBottom: 16 }}>{error || 'No data found'}</Text>
        <Pressable 
          style={styles.retryButton} 
          onPress={() => {
            setLoading(true);
            getDashboardData()
              .then(d => { setData(d); setError(null); })
              .catch(e => setError(e.message))
              .finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // Map trend data
  const trendPoints = (data.trendData || []).map((t, index) => ({
    day: t.date || `D${index+1}`,
    value: t.lifeScore,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader />

        {/* Quick Log Banner */}
        <Pressable
          style={styles.quickLogBanner}
          onPress={() => router.push('/(tabs)/new-entry')}
          accessibilityRole="button"
          accessibilityLabel="Log today's entry"
        >
          <View style={styles.quickLogLeft}>
            <View style={styles.quickLogIcon}>
              <Ionicons name="add" size={20} color={colors.background} />
            </View>
            <View>
              <Text style={styles.quickLogTitle}>Track Today's Habits</Text>
              <Text style={styles.quickLogSubtitle}>Log sleep, focus, activity & spend</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>

        {/* Phase 1 & 2 Granular Telemetry & Experiment Actions */}
        <View style={styles.telemetryQuickRow}>
          <Pressable
            style={styles.telemetryActionBtn}
            onPress={() => setShowTxModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Log financial transaction"
          >
            <Ionicons name="card-outline" size={16} color={colors.primary} />
            <Text style={styles.telemetryActionText}>+ Spend</Text>
          </Pressable>

          <Pressable
            style={styles.telemetryActionBtn}
            onPress={() => setShowFocusModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Start deep work timer"
          >
            <Ionicons name="timer-outline" size={16} color={colors.primary} />
            <Text style={styles.telemetryActionText}>Focus Session</Text>
          </Pressable>

          <Pressable
            style={styles.telemetryActionBtn}
            onPress={() => setShowExperimentHub(true)}
            accessibilityRole="button"
            accessibilityLabel="Open behavioral experiments hub"
          >
            <Ionicons name="flask-outline" size={16} color={colors.primary} />
            <Text style={styles.telemetryActionText}>+ Experiment</Text>
          </Pressable>
        </View>

        {/* Phase 2 Active Behavioral Experiments (Core Loop) */}
        {activeExperiments.map((prog) => (
          <ActiveExperimentCard
            key={prog.experiment.id}
            progress={prog}
            onRefresh={fetchActiveExperiments}
            onViewEvaluation={(expId) => {
              setSelectedExpId(expId);
              setShowEvaluationModal(true);
            }}
          />
        ))}

        {/* Phase 1 Daily Habits Matrix with Streaks */}
        <HabitsMatrix />
        
        {data.insight && (
          <InsightCard 
            title={data.insight.title}
            summary={data.insight.summary}
            whyItMatters={data.insight.whyItMatters}
            action={data.insight.actionForToday}
            onStartExperiment={(insight) => {
              setCreateInitialData({
                title: `Test: ${insight.title}`,
                hypothesis: insight.summary,
                intervention_rule: insight.action,
                target_metric: 'sleep_hours',
              });
              setShowCreateExperiment(true);
            }}
          />
        )}

        {data.lifeScore && (
          <LifeScoreCard 
            score={data.lifeScore.overall}
            change={data.lifeScore.change}
            categories={data.scoreBreakdown?.map(sb => ({
              name: sb.category,
              score: sb.score,
              color: sb.color,
            }))}
          />
        )}

        {data.scoreBreakdown && (
          <ScoreBreakdown 
            categories={data.scoreBreakdown.map(sb => ({
              name: sb.category,
              score: sb.score,
              color: sb.color,
            }))}
          />
        )}

        {trendPoints.length > 0 && (
          <TrendCard 
            data={trendPoints} 
            latestScore={data.lifeScore?.overall} 
          />
        )}

        {data.prediction && (
          <ProductivityPrediction 
            predictedScore={data.prediction.score}
            keyDriver={data.prediction.keyDriver}
            recommendation={data.prediction.recommendation}
          />
        )}

        {data.insights && data.insights.length > 0 && (
          <InsightsList insights={data.insights} />
        )}

        {data.clusters && data.clusters.length > 0 && (
          <BehaviouralClusters clusters={data.clusters} />
        )}

        {data.correlations && data.correlations.length > 0 && (
          <CorrelationCards correlations={data.correlations} />
        )}

        {data.anomalies && data.anomalies.length > 0 && (
          <AnomalyAlerts alerts={data.anomalies} />
        )}
      </ScrollView>

      {/* Phase 1 Modals */}
      <TransactionModal
        visible={showTxModal}
        onClose={() => setShowTxModal(false)}
      />
      <FocusTimerModal
        visible={showFocusModal}
        onClose={() => setShowFocusModal(false)}
      />

      {/* Phase 2 Behavioral Experimentation Modals */}
      <ExperimentModal
        visible={showCreateExperiment}
        onClose={() => {
          setShowCreateExperiment(false);
          setCreateInitialData(null);
        }}
        initialData={createInitialData}
        onSuccess={() => {
          fetchActiveExperiments();
        }}
      />

      <ExperimentEvaluationModal
        visible={showEvaluationModal}
        experimentId={selectedExpId}
        onClose={() => {
          setShowEvaluationModal(false);
          setSelectedExpId(null);
        }}
        onSuccess={() => {
          fetchActiveExperiments();
        }}
      />

      <ExperimentHubModal
        visible={showExperimentHub}
        onClose={() => setShowExperimentHub(false)}
        onOpenCreate={(initData) => {
          setCreateInitialData(initData);
          setShowCreateExperiment(true);
        }}
        onOpenEvaluation={(expId) => {
          setSelectedExpId(expId);
          setShowEvaluationModal(true);
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  retryButton: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
  },
  quickLogBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.3)',
  },
  quickLogLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  quickLogIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLogTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickLogSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  telemetryQuickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xs,
  },
  telemetryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  telemetryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
