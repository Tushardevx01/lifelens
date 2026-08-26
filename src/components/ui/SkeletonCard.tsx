/**
 * SkeletonCard – LifeLens UI Primitive
 *
 * Dark skeleton placeholder for loading states.
 * Uses a simple opacity pulse animation (no external library needed).
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { radius }  from '@/src/theme/radius';
import { spacing } from '@/src/theme/spacing';

type SkeletonLineProps = {
  width?: string | number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonLine({ width = '100%', height = 14, style }: SkeletonLineProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.surfaceHigh,
          borderRadius: radius.sm,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

type SkeletonCardProps = {
  style?: StyleProp<ViewStyle>;
};

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLine width="45%" height={12} />
      <SkeletonLine width="70%" height={48} style={{ marginTop: spacing.md }} />
      <SkeletonLine width="55%" height={12} style={{ marginTop: spacing.lg }} />
      <SkeletonLine width="80%" height={12} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

export function SkeletonMetric({ style }: SkeletonCardProps) {
  return (
    <View style={[styles.metric, style]}>
      <SkeletonLine width="60%" height={12} />
      <SkeletonLine width="50%" height={36} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  metric: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    flex: 1,
    minWidth: '45%',
  },
});
