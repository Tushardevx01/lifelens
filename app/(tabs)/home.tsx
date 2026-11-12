import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { colors } from '@/src/theme/colors';
import { DashboardData } from '@/src/features/dashboard/dashboard.types';
import { getDashboardData, authApi, briefingsApi } from '@/src/services/api';

import DashboardHeader from '@/src/components/dashboard/DashboardHeader';
import LifeScoreCard from '@/src/components/dashboard/LifeScoreCard';
import TrendCard from '@/src/components/dashboard/TrendCard';
import {
  DailyBriefingCard,
  MorningBriefingModal,
  WeeklyStoryModal,
} from '@/src/components/briefings';
import type { User, WeeklyReviewStory } from '@/src/types/api.types';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMorningBriefingModal, setShowMorningBriefingModal] = useState(false);
  const [weeklyStory, setWeeklyStory] = useState<WeeklyReviewStory | null>(null);
  const [showWeeklyStoryModal, setShowWeeklyStoryModal] = useState(false);

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
      // Handled gracefully
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
        <Text>No data found</Text>
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
        <DashboardHeader
          name={currentUser?.full_name || 'LifeLens Member'}
          onAvatarPress={() => router.push('/(tabs)/settings')}
        />

        {/* Daily Morning Briefing Card */}
        {data.morningBriefing && (
          <DailyBriefingCard
            briefing={data.morningBriefing}
            userName={currentUser?.full_name || 'LifeLens Member'}
            onOpenMorningModal={() => setShowMorningBriefingModal(true)}
            onOpenWeeklyModal={handleOpenWeeklyStory}
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

        {trendPoints.length > 0 && (
          <TrendCard 
            data={trendPoints} 
            latestScore={data.lifeScore?.overall} 
          />
        )}
      </ScrollView>

      {/* Briefing Modal */}
      <MorningBriefingModal
        visible={showMorningBriefingModal}
        briefing={data.morningBriefing}
        userName={currentUser?.full_name || 'LifeLens Member'}
        onClose={() => setShowMorningBriefingModal(false)}
      />

      <WeeklyStoryModal
        visible={showWeeklyStoryModal}
        story={weeklyStory}
        onClose={() => setShowWeeklyStoryModal(false)}
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
});
