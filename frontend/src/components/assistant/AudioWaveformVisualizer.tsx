import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/src/theme/colors';

interface AudioWaveformVisualizerProps {
  volume: number; // 0.0 to 1.0
  active: boolean;
  barCount?: number;
  barColor?: string;
}

export function AudioWaveformVisualizer({
  volume,
  active,
  barCount = 14,
  barColor = colors.primary,
}: AudioWaveformVisualizerProps) {
  // Animated heights for each bar
  const barAnimations = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(6))
  ).current;

  useEffect(() => {
    if (!active) {
      // Reset all bars to idle height
      barAnimations.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 6,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    // Distribute volume into varied bar heights with center emphasis
    barAnimations.forEach((anim, index) => {
      // Bell curve factor (higher in center)
      const center = (barCount - 1) / 2;
      const distFromCenter = Math.abs(index - center);
      const curveFactor = Math.max(0.3, 1 - (distFromCenter / center) * 0.7);

      // Random jitter for organic waveform effect
      const jitter = 0.8 + Math.random() * 0.4;
      const targetHeight = Math.max(6, Math.min(48, volume * 48 * curveFactor * jitter));

      Animated.spring(anim, {
        toValue: targetHeight,
        friction: 5,
        tension: 80,
        useNativeDriver: false,
      }).start();
    });
  }, [volume, active, barAnimations, barCount]);

  return (
    <View style={styles.container}>
      {barAnimations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: anim,
              backgroundColor: barColor,
              opacity: active ? 0.9 : 0.3,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: 4,
    paddingHorizontal: 16,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 6,
  },
});

