import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Text,
  StatusBar,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { DashboardData } from '@/src/features/dashboard/dashboard.types';
import { getDashboardData, authApi, briefingsApi } from '@/src/services/api';

import DashboardHeader from '@/src/components/dashboard/DashboardHeader';
import LifeScoreCard from '@/src/components/dashboard/LifeScoreCard';
import LifeStatsGrid from '@/src/components/dashboard/LifeStatsGrid';
import TrendCard from '@/src/components/dashboard/TrendCard';
import AlertsModal from '@/src/components/dashboard/AlertsModal';
import {
  DailyBriefingCard,
  MorningBriefingModal,
  WeeklyStoryModal,
} from '@/src/components/briefings';
import {
  WorkoutModal,
  SleepTrackerModal,
  FocusTimerModal,
  TransactionModal,
  ScreenTimeModal,
} from '@/src/components/telemetry';
import type { User, WeeklyReviewStory } from '@/src/types/api.types';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showMorningBriefingModal, setShowMorningBriefingModal] = useState(false);
  const [weeklyStory, setWeeklyStory] = useState<WeeklyReviewStory | null>(null);
  const [showWeeklyStoryModal, setShowWeeklyStoryModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(2);

  // Telemetry modals
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showScreenTimeModal, setShowScreenTimeModal] = useState(false);

  const handleOpenWeeklyStory = async () => {
    try {
      const story = await briefingsApi.getWeekly();
      setWeeklyStory(story);
      setShowWeeklyStoryModal(true);
    } catch {
      Alert.alert(
        'Weekly Story',
        'Weekly review is not available yet. Log a few days of data and try again.'
      );
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedData, user] = await Promise.all([
        getDashboardData(),
        authApi.me().catch(() => null),
      ]);
      setData(fetchedData);
      if (user) setCurrentUser(user);
    } catch {
      // Handled gracefully with fallback mock data inside getDashboardData
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No dashboard data found</Text>
      </View>
    );
  }

  // Map trend data
  const trendPoints = (data.trendData || []).map((t, index) => ({
    day: t.date || `D${index + 1}`,
    value: t.lifeScore,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 130, paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Avatar, Greeting, Gemini AI Shortcut & Notifications */}
        <DashboardHeader
          name={currentUser?.full_name || 'LifeLens Member'}
          hasUnreadAlerts={unreadAlertCount > 0}
          onAvatarPress={() => router.push('/(tabs)/settings')}
          onAiPress={() => router.push('/chat')}
          onBellPress={() => setShowAlertsModal(true)}
        />

        {/* Daily Morning Briefing Card (if present) */}
        {data.morningBriefing && (
          <DailyBriefingCard
            briefing={data.morningBriefing}
            userName={currentUser?.full_name || 'LifeLens Member'}
            onOpenMorningModal={() => setShowMorningBriefingModal(true)}
            onOpenWeeklyModal={handleOpenWeeklyStory}
          />
        )}

        {/* Life Score & Domain Progress Card */}
        {data.lifeScore && (
          <LifeScoreCard
            score={data.lifeScore.overall}
            change={data.lifeScore.change}
            categories={data.scoreBreakdown?.map((sb) => ({
              name: sb.category,
              score: sb.score,
              color: sb.color,
            }))}
          />
        )}

        {/* Consolidated Daily Life Stats Grid (Steps, Sleep, Focus, Expenses, Screen Time, Wellbeing) */}
        <LifeStatsGrid
          entry={data.latestEntry}
          stepGoal={10000}
          onOpenWorkout={() => setShowWorkoutModal(true)}
          onOpenSleep={() => setShowSleepModal(true)}
          onOpenFocus={() => setShowFocusModal(true)}
          onOpenTransaction={() => setShowTransactionModal(true)}
          onOpenScreenTime={() => setShowScreenTimeModal(true)}
          onOpenNewEntry={() => router.push('/(tabs)/new-entry')}
        />

        {/* 7-Day / 30-Day Score Trend Card */}
        {trendPoints.length > 0 && (
          <TrendCard
            data={trendPoints}
            latestScore={data.lifeScore?.overall}
          />
        )}

        {/* Quick Navigation Hub */}
        <View style={styles.quickNavSection}>
          <Text style={styles.sectionTitle}>EXPLORE</Text>
          <View style={styles.quickNavGrid}>
            <Pressable
              style={({ pressed }) => [styles.quickNavCard, pressed && styles.cardPressed]}
              onPress={() => router.push('/(tabs)/new-entry')}
              accessibilityRole="button"
              accessibilityLabel="Log today's entry"
            >
              <View style={[styles.navIconWrap, { backgroundColor: 'rgba(184, 255, 61, 0.12)' }]}>
                <Ionicons name="add-circle" size={20} color={colors.primary} />
              </View>
              <Text style={styles.quickNavTitle}>Log Today</Text>
              <Text style={styles.quickNavSubtitle}>Record journal</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickNavCard, pressed && styles.cardPressed]}
              onPress={() => router.push('/(tabs)/analytics')}
              accessibilityRole="button"
              accessibilityLabel="View comprehensive analytics"
            >
              <View style={[styles.navIconWrap, { backgroundColor: 'rgba(96, 165, 250, 0.12)' }]}>
                <Ionicons name="stats-chart" size={20} color="#60A5FA" />
              </View>
              <Text style={styles.quickNavTitle}>Analytics</Text>
              <Text style={styles.quickNavSubtitle}>Correlations</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickNavCard, pressed && styles.cardPressed]}
              onPress={() => router.push('/(tabs)/insights')}
              accessibilityRole="button"
              accessibilityLabel="View behavioral insights"
            >
              <View style={[styles.navIconWrap, { backgroundColor: 'rgba(167, 139, 250, 0.12)' }]}>
                <Ionicons name="bulb" size={20} color="#A78BFA" />
              </View>
              <Text style={styles.quickNavTitle}>Insights</Text>
              <Text style={styles.quickNavSubtitle}>AI patterns</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickNavCard, pressed && styles.cardPressed]}
              onPress={() => router.push('/(tabs)/history')}
              accessibilityRole="button"
              accessibilityLabel="View history timeline"
            >
              <View style={[styles.navIconWrap, { backgroundColor: 'rgba(251, 146, 60, 0.12)' }]}>
                <Ionicons name="calendar" size={20} color="#FB923C" />
              </View>
              <Text style={styles.quickNavTitle}>History</Text>
              <Text style={styles.quickNavSubtitle}>All logs</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Daily Morning Briefing Modal */}
      <MorningBriefingModal
        visible={showMorningBriefingModal}
        briefing={data.morningBriefing}
        userName={currentUser?.full_name || 'LifeLens Member'}
        onClose={() => setShowMorningBriefingModal(false)}
      />

      {/* Weekly Review Story Modal */}
      <WeeklyStoryModal
        visible={showWeeklyStoryModal}
        story={weeklyStory}
        onClose={() => setShowWeeklyStoryModal(false)}
      />

      {/* Lifestyle Alerts & Anomaly Center Modal */}
      <AlertsModal
        visible={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        onAlertCountChange={setUnreadAlertCount}
      />

      {/* Telemetry Modals (Accessible directly from LifeStatsGrid) */}
      <WorkoutModal
        visible={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        onSuccess={() => {
          setShowWorkoutModal(false);
          loadData();
        }}
      />

      <SleepTrackerModal
        visible={showSleepModal}
        onClose={() => setShowSleepModal(false)}
        onSuccess={() => {
          setShowSleepModal(false);
          loadData();
        }}
      />

      <FocusTimerModal
        visible={showFocusModal}
        onClose={() => setShowFocusModal(false)}
        onSuccess={() => {
          setShowFocusModal(false);
          loadData();
        }}
      />

      <TransactionModal
        visible={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={() => {
          setShowTransactionModal(false);
          loadData();
        }}
      />

      <ScreenTimeModal
        visible={showScreenTimeModal}
        onClose={() => setShowScreenTimeModal(false)}
        onSuccess={() => {
          setShowScreenTimeModal(false);
          loadData();
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
  errorText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  quickNavSection: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  quickNavGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickNavCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickNavTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  quickNavSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
