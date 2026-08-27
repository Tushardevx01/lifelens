import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, Pressable, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';
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

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const fetchedData = await getDashboardData();
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
        
        {data.insight && (
          <InsightCard 
            title={data.insight.title}
            summary={data.insight.summary}
            whyItMatters={data.insight.whyItMatters}
            action={data.insight.actionForToday}
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
});
