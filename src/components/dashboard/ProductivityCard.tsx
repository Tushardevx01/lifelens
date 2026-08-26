/**
 * ProductivityCard – LifeLens Dashboard Component
 *
 * Tomorrow's productivity prediction.  The score number dominates.
 * Supporting info (key driver, recommendation) uses smaller type.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius }  from '@/src/theme/radius';
import CircularProgress from './CircularProgress';

interface ProductivityCardProps {
  predictedScore?:  number;
  keyDriver?:       string;
  recommendation?:  string;
  focusWindow?:     string;
}

export default function ProductivityCard({
  predictedScore = 88,
  keyDriver      = 'Sleep Quality (8.1 hrs) & Low Evening Screen Time',
  recommendation = 'Schedule your most challenging task between 9:30 AM and 12:00 PM.',
  focusWindow    = '9:30 AM – 12:00 PM',
}: ProductivityCardProps) {
  return (
    <View style={styles.card}>
      {/* Top row – label + badge */}
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>Tomorrow</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Prediction</Text>
        </View>
      </View>

      {/* Score + ring row */}
      <View style={styles.scoreRow}>
        <View>
          <Text style={styles.scoreNumber}>{predictedScore}</Text>
          <Text style={styles.scoreLabel}>Productivity</Text>
        </View>
        <CircularProgress
          size={90}
          progress={predictedScore}
          color={colors.blue}
          strokeWidth={8}
          backgroundColor={colors.surfaceHigh}
        >
          <Ionicons name="trending-up" size={20} color={colors.blue} />
        </CircularProgress>
      </View>

      {/* Focus window */}
      <View style={styles.focusRow}>
        <Ionicons name="time-outline" size={14} color={colors.primary} />
        <Text style={styles.focusLabel}>Best focus window</Text>
        <Text style={styles.focusTime}>{focusWindow}</Text>
      </View>

      <View style={styles.divider} />

      {/* Driver + recommendation */}
      <View style={styles.infoRow}>
        <Ionicons name="bulb-outline" size={14} color={colors.yellow} />
        <Text style={styles.infoText}>{recommendation}</Text>
      </View>

      <View style={styles.driverRow}>
        <Text style={styles.driverLabel}>Key driver: </Text>
        <Text style={styles.driverValue}>{keyDriver}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: 'rgba(93, 169, 255, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.blue,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1.5,
    lineHeight: 56,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  focusLabel: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  focusTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    flex: 1,
  },
  driverRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  driverLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  driverValue: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
});
