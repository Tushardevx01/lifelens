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
        <View style={styles.headerLeft}>
          <SkeletonBlock style={styles.avatarSkeleton} />
          <View>
            <SkeletonBlock style={styles.titleSkeleton} />
            <SkeletonBlock style={styles.subtitleSkeleton} />
          </View>
        </View>
        <SkeletonBlock style={styles.bellSkeleton} />
      </View>

      <View style={styles.card}>
        <SkeletonBlock style={styles.cardTitleSkeleton} />
        <SkeletonBlock style={styles.cardLineSkeleton} />
        <SkeletonBlock style={[styles.cardLineSkeleton, { width: '80%' }]} />
      </View>

      <View style={styles.card}>
        <View style={styles.scoreSkeletonContainer}>
          <SkeletonBlock style={styles.bigScoreSkeleton} />
          <SkeletonBlock style={styles.smallScoreSkeleton} />
        </View>
        <View style={styles.gridSkeleton}>
          <SkeletonBlock style={styles.gridItemSkeleton} />
          <SkeletonBlock style={styles.gridItemSkeleton} />
          <SkeletonBlock style={styles.gridItemSkeleton} />
          <SkeletonBlock style={styles.gridItemSkeleton} />
        </View>
      </View>

      <View style={styles.card}>
        <SkeletonBlock style={styles.cardTitleSkeleton} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.breakdownRow}>
            <SkeletonBlock style={styles.breakdownLabel} />
            <SkeletonBlock style={styles.breakdownBar} />
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarSkeleton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  titleSkeleton: {
    width: 100,
    height: 14,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  subtitleSkeleton: {
    width: 60,
    height: 10,
    borderRadius: 4,
  },
  bellSkeleton: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  cardTitleSkeleton: {
    width: 140,
    height: 16,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  cardLineSkeleton: {
    width: '100%',
    height: 12,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  scoreSkeletonContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  bigScoreSkeleton: {
    width: 120,
    height: 48,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  smallScoreSkeleton: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  gridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItemSkeleton: {
    width: '48%',
    height: 48,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    marginRight: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  breakdownLabel: {
    width: 70,
    height: 12,
    borderRadius: 4,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  skeletonBlock: {
    backgroundColor: colors.surfaceSecondary,
  },
});
