import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView, ViewStyle } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

function SkeletonBlock({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeletonBlock, style, { opacity }]} />;
}

export default function DashboardSkeleton() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <SkeletonBlock style={styles.titleSkeleton} />
        <SkeletonBlock style={styles.subtitleSkeleton} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <SkeletonBlock style={styles.bigScoreSkeleton} />
          <SkeletonBlock style={styles.changeSkeleton} />
        </View>
        <SkeletonBlock style={styles.circleSkeleton} />
      </View>

      <View style={styles.gridContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.gridItem}>
            <SkeletonBlock style={styles.gridLabelSkeleton} />
            <SkeletonBlock style={styles.gridScoreSkeleton} />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <SkeletonBlock style={styles.cardTitleSkeleton} />
        <SkeletonBlock style={styles.cardLineSkeleton} />
        <SkeletonBlock style={[styles.cardLineSkeleton, { width: '80%' }]} />
      </View>

      <View style={styles.card}>
        <SkeletonBlock style={styles.cardTitleSkeleton} />
        <View style={styles.chartSkeleton}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <SkeletonBlock key={i} style={styles.barSkeleton} />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <SkeletonBlock style={styles.cardTitleSkeleton} />
        {[1, 2].map((i) => (
          <SkeletonBlock key={i} style={styles.cardLineSkeleton} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  titleSkeleton: {
    width: 120,
    height: 20,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  subtitleSkeleton: {
    width: 80,
    height: 14,
    borderRadius: radius.sm,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.hero,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.xxxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  bigScoreSkeleton: {
    width: 140,
    height: 48,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  changeSkeleton: {
    width: 100,
    height: 14,
    borderRadius: radius.sm,
  },
  circleSkeleton: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  gridItem: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    flex: 1,
    minWidth: '45%',
  },
  gridLabelSkeleton: {
    width: 60,
    height: 12,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  gridScoreSkeleton: {
    width: 50,
    height: 32,
    borderRadius: radius.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.xxl,
  },
  cardTitleSkeleton: {
    width: 140,
    height: 16,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  cardLineSkeleton: {
    width: '100%',
    height: 12,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  chartSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barSkeleton: {
    width: 20,
    borderRadius: radius.sm,
  },
  skeletonBlock: {
    backgroundColor: colors.surfaceElevated,
  },
});
