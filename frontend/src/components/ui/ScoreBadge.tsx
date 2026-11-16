/**
 * ScoreBadge – LifeLens UI Component
 *
 * Displays a standardized health indicator badge showing:
 * - Category name ("Healthy" | "Moderate" | "Unhealthy" | "Severe" | "Not available")
 * - Matching indicator color (#F4C542, #55B96B, #315A91, #E55353, or #8E8E93)
 * - Optional status dot
 * - Optional numerical score prefix (e.g. "85 • Severe" or "85/100")
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

import {
  getScoreClassification,
  getCategoryBadgeBg,
  ScoreClassification,
} from '@/src/utils/scoreClassification';

export interface ScoreBadgeProps {
  score?: number | null;
  classification?: ScoreClassification;
  showScore?: boolean;
  scoreSuffix?: string; // e.g. "/100"
  showDot?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export function ScoreBadge({
  score,
  classification: customClassification,
  showScore = false,
  scoreSuffix,
  showDot = true,
  size = 'sm',
  style,
  textStyle,
  accessibilityLabel,
}: ScoreBadgeProps) {
  const classification = customClassification ?? getScoreClassification(score);
  const { name, color, isValid } = classification;
  const badgeBg = getCategoryBadgeBg(color, 0.15);
  const borderColor = getCategoryBadgeBg(color, 0.35);

  const isDarkNavy = color === '#315A91';
  // Use category color, or navy text for navy badge
  const contentColor = isDarkNavy ? '#234470' : color;

  const sizeStyles = {
    xs: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
      dotSize: 5,
    },
    sm: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 11,
      dotSize: 6,
    },
    md: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      fontSize: 13,
      dotSize: 7,
    },
    lg: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14,
      dotSize: 8,
    },
  }[size];

  const scoreText =
    isValid && score !== null && score !== undefined
      ? `${Math.round(score)}${scoreSuffix ?? ''} • `
      : '';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeBg,
          borderColor: borderColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `Score category: ${name}`}
    >
      {showDot && (
        <View
          style={[
            styles.dot,
            {
              width: sizeStyles.dotSize,
              height: sizeStyles.dotSize,
              borderRadius: sizeStyles.dotSize / 2,
              backgroundColor: color,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            fontSize: sizeStyles.fontSize,
            color: contentColor,
          },
          textStyle,
        ]}
      >
        {showScore ? scoreText : ''}
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {},
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
