/**
 * CircularProgress – LifeLens Dashboard Component
 *
 * Pure React Native circular progress ring (no SVG dependency).
 * Uses View border tricks to render a clean arc.
 *
 * Approach: two rotated half-circles (left + right clipped to fill arc).
 * This works cleanly in Expo Go without react-native-svg.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { colors } from '@/src/theme/colors';

interface CircularProgressProps {
  size:         number;
  progress:     number;   // 0–100
  color?:       string;
  strokeWidth?: number;
  children?:    React.ReactNode;
  backgroundColor?: string;
}

export default function CircularProgress({
  size,
  progress,
  color       = colors.primary,
  strokeWidth = 8,
  children,
  backgroundColor = colors.surfaceElevated,
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  const halfSize = size / 2;

  // Convert progress to degrees (0–360)
  const degrees = (clamped / 100) * 360;

  // We render the arc using two half-circle views.
  // For progress <= 50: only right half is revealed
  // For progress > 50: right half fully filled + left half partially filled
  const rightDeg  = Math.min(degrees, 180);
  const leftDeg   = Math.max(0, degrees - 180);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Track ring */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      />

      {/* Filled arc – right half */}
      <View
        style={[
          styles.halfCircleContainer,
          {
            width: halfSize,
            height: size,
            left: halfSize,
          },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: color,
              transform: [{ rotate: `${rightDeg - 180}deg` }],
            },
          ]}
        />
      </View>

      {/* Filled arc – left half (only visible when progress > 50%) */}
      {leftDeg > 0 && (
        <View
          style={[
            styles.halfCircleContainer,
            {
              width: halfSize,
              height: size,
              left: 0,
            },
          ]}
        >
          <View
            style={[
              styles.halfCircleLeft,
              {
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: color,
                transform: [{ rotate: `${leftDeg}deg` }],
              },
            ]}
          />
        </View>
      )}

      {/* Children centered */}
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
  },
  ring: {
    position: 'absolute',
  },
  halfCircleContainer: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    // Show only right side of the ring
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  halfCircleLeft: {
    position: 'absolute',
    top: 0,
    right: 0,
    // Show only left side of the ring
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
  },
  children: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
