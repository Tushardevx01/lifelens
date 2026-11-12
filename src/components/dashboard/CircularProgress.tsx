/**
 * CircularProgress – LifeLens Dashboard Component
 *
 * SVG-based circular progress ring rendered via react-native-svg.
 * Clean circular gauge with background track and progress arc.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/src/theme/colors';

interface CircularProgressProps {
  size: number;
  progress: number; // 0–100
  color?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
  backgroundColor?: string;
}

export default function CircularProgress({
  size,
  progress,
  color = colors.primary,
  strokeWidth = 8,
  children,
  backgroundColor = colors.surfaceElevated,
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, isNaN(progress) ? 0 : progress));
  const center = size / 2;
  const radius = Math.max(0, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Track Ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Filled Progress Arc */}
        {clamped > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>

      {/* Centered children */}
      {children && (
        <View style={[styles.children, { width: size, height: size }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  children: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
