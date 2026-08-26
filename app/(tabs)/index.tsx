import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { mockDashboardData } from '@/src/features/dashboard';
import {
  DashboardHeader,
  InsightCard,
  LifeScoreCard,
  ScoreBreakdown,
  LifeScoreTrend,
  ProductivityPrediction,
  InsightsList,
  BehaviouralClusters,
  Correlations,
  AnomalyAlerts,
} from '@/src/components/dashboard';

const SECTIONS = [
  DashboardHeader,
  InsightCard,
  LifeScoreCard,
  ScoreBreakdown,
  LifeScoreTrend,
  ProductivityPrediction,
  InsightsList,
  BehaviouralClusters,
  Correlations,
  AnomalyAlerts,
] as const;

export default function DashboardScreen() {
  const fadeAnims = useRef(
    SECTIONS.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  useEffect(() => {
    const animations = fadeAnims.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 500,
          delay: index * 80,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 500,
          delay: index * 80,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(0, animations).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = mockDashboardData;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnims[0].opacity, transform: [{ translateY: fadeAnims[0].translateY }] }}>
          <DashboardHeader />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[1].opacity, transform: [{ translateY: fadeAnims[1].translateY }] }}>
          <InsightCard title={data.insight.title} summary={data.insight.summary} whyItMatters={data.insight.whyItMatters} actionForToday={data.insight.actionForToday} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[2].opacity, transform: [{ translateY: fadeAnims[2].translateY }] }}>
          <LifeScoreCard score={data.lifeScore.overall} change={data.lifeScore.change} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[3].opacity, transform: [{ translateY: fadeAnims[3].translateY }] }}>
          <ScoreBreakdown categories={data.scoreBreakdown.map(c => ({ name: c.category, score: c.score, color: c.color }))} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[4].opacity, transform: [{ translateY: fadeAnims[4].translateY }] }}>
          <LifeScoreTrend data={data.trendData.map(d => ({ day: d.date, life: d.lifeScore, sleep: d.sleep, productivity: d.productivity }))} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[5].opacity, transform: [{ translateY: fadeAnims[5].translateY }] }}>
          <ProductivityPrediction predictedScore={data.prediction.score} keyDriver={data.prediction.keyDriver} recommendation={data.prediction.recommendation} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[6].opacity, transform: [{ translateY: fadeAnims[6].translateY }] }}>
          <InsightsList insights={data.insights} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[7].opacity, transform: [{ translateY: fadeAnims[7].translateY }] }}>
          <BehaviouralClusters clusters={data.clusters} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[8].opacity, transform: [{ translateY: fadeAnims[8].translateY }] }}>
          <Correlations correlations={data.correlations} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[9].opacity, transform: [{ translateY: fadeAnims[9].translateY }] }}>
          <AnomalyAlerts alerts={data.anomalies.map(a => ({ date: a.date, title: a.title, description: a.description }))} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
    paddingBottom: 100,
  },
});
