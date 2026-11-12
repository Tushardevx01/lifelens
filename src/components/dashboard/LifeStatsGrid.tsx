/**
 * LifeStatsGrid — Consolidated Life Dashboard Component
 *
 * Displays the 6 essential daily life statistics in clean, minimal, readable cards:
 *   1. Daily Steps & Locomotion (with goal progress bar)
 *   2. Sleep Duration & Quality (hours, stars, bedtime)
 *   3. Productivity & Focus (deep work hours, tasks completed)
 *   4. Daily Spending & Expenses (amount, category, discretionary ratio)
 *   5. Screen Time & Digital Habits (total screen, social media)
 *   6. Subjective Wellbeing (mood rating, energy stars)
 *
 * Requirements:
 * - Highlights important numbers first with high legibility.
 * - Handles missing data gracefully with '--' and tap-to-log prompts.
 * - Tapping any card opens the corresponding modal or detailed view.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import type { DailyEntry } from '@/src/types/api.types';

interface LifeStatsGridProps {
  entry?: DailyEntry | null;
  stepGoal?: number;
  onOpenWorkout?: () => void;
  onOpenSleep?: () => void;
  onOpenFocus?: () => void;
  onOpenTransaction?: () => void;
  onOpenScreenTime?: () => void;
  onOpenNewEntry?: () => void;
}

export default function LifeStatsGrid({
  entry,
  stepGoal = 10000,
  onOpenWorkout,
  onOpenSleep,
  onOpenFocus,
  onOpenTransaction,
  onOpenScreenTime,
  onOpenNewEntry,
}: LifeStatsGridProps) {
  // Steps & Movement
  const steps = entry?.steps;
  const stepsProgress = steps !== undefined && steps !== null ? Math.min(100, Math.round((steps / stepGoal) * 100)) : null;
  const activeMinutes = entry?.active_minutes;
  const calories = entry?.calories_burned;

  // Sleep
  const sleepHours = entry?.sleep_hours;
  const sleepQuality = entry?.sleep_quality;
  const bedtime = entry?.sleep_bedtime;

  // Productivity
  const deepWorkHours = entry?.deep_work_hours;
  const tasksCompleted = entry?.tasks_completed;

  // Finance
  const dailySpend = entry?.daily_spend;
  const spendCategory = entry?.spend_category;

  // Screen Time
  const screenTime = entry?.screen_time_hours;
  const socialTime = entry?.social_media_hours;

  // Subjective
  const mood = entry?.mood_score;
  const energy = entry?.energy_level;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Vital Statistics</Text>
        <Text style={styles.sectionSubtitle}>Tap any card to log or inspect</Text>
      </View>

      <View style={styles.grid}>
        {/* 1. Steps & Movement */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={onOpenWorkout || onOpenNewEntry}
          accessibilityLabel="Daily steps card"
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(184, 255, 0, 0.12)' }]}>
              <Ionicons name="footsteps-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardDomainLabel}>Movement</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.primaryMetric}>
              {steps !== undefined && steps !== null ? steps.toLocaleString() : '--'}
            </Text>
            <Text style={styles.metricUnit}>steps</Text>
          </View>

          {/* Goal Progress bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${stepsProgress ?? 0}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>

          <Text style={styles.secondaryDetail}>
            {activeMinutes !== undefined && activeMinutes !== null
              ? `${activeMinutes}m active`
              : 'Tap to log'}
            {calories ? ` · ${calories} kcal` : ''}
          </Text>
        </Pressable>

        {/* 2. Sleep & Rest */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={onOpenSleep || onOpenNewEntry}
          accessibilityLabel="Sleep duration and quality card"
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(0, 212, 170, 0.12)' }]}>
              <Ionicons name="moon-outline" size={18} color={colors.cyan} />
            </View>
            <Text style={styles.cardDomainLabel}>Sleep</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.primaryMetric}>
              {sleepHours !== undefined && sleepHours !== null ? `${sleepHours.toFixed(1)}` : '--'}
            </Text>
            <Text style={styles.metricUnit}>hrs</Text>
          </View>

          {/* Sleep Quality & Bedtime */}
          <View style={styles.tagRow}>
            {sleepQuality ? (
              <View style={[styles.pillBadge, { backgroundColor: 'rgba(0, 212, 170, 0.15)' }]}>
                <Text style={[styles.pillBadgeText, { color: colors.cyan }]}>
                  {sleepQuality}/5 ★
                </Text>
              </View>
            ) : null}
            {bedtime ? (
              <Text style={styles.timeTag}>Bed: {bedtime}</Text>
            ) : null}
          </View>

          <Text style={styles.secondaryDetail}>
            {sleepHours !== undefined && sleepHours !== null ? 'Target: 7–9 hrs' : 'Tap to log sleep'}
          </Text>
        </Pressable>

        {/* 3. Productivity & Focus */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={onOpenFocus || onOpenNewEntry}
          accessibilityLabel="Productivity and deep work card"
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(74, 158, 255, 0.12)' }]}>
              <Ionicons name="flash-outline" size={18} color={colors.blue} />
            </View>
            <Text style={styles.cardDomainLabel}>Deep Work</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.primaryMetric}>
              {deepWorkHours !== undefined && deepWorkHours !== null ? `${deepWorkHours.toFixed(1)}` : '--'}
            </Text>
            <Text style={styles.metricUnit}>hrs</Text>
          </View>

          <View style={styles.tagRow}>
            {tasksCompleted !== undefined && tasksCompleted !== null ? (
              <View style={[styles.pillBadge, { backgroundColor: 'rgba(74, 158, 255, 0.15)' }]}>
                <Text style={[styles.pillBadgeText, { color: colors.blue }]}>
                  {tasksCompleted} tasks done
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.secondaryDetail}>
            {deepWorkHours !== undefined && deepWorkHours !== null ? 'Peak focus block' : 'Launch focus timer'}
          </Text>
        </Pressable>

        {/* 4. Spending & Expenses */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={onOpenTransaction || onOpenNewEntry}
          accessibilityLabel="Daily spending card"
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(255, 159, 67, 0.12)' }]}>
              <Ionicons name="wallet-outline" size={18} color={colors.orange} />
            </View>
            <Text style={styles.cardDomainLabel}>Expenses</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.primaryMetric}>
              {dailySpend !== undefined && dailySpend !== null ? `₹${Math.round(dailySpend).toLocaleString()}` : '--'}
            </Text>
          </View>

          <View style={styles.tagRow}>
            {spendCategory ? (
              <View style={[styles.pillBadge, { backgroundColor: 'rgba(255, 159, 67, 0.15)' }]}>
                <Text style={[styles.pillBadgeText, { color: colors.orange }]} numberOfLines={1}>
                  {spendCategory}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.secondaryDetail}>
            {dailySpend !== undefined && dailySpend !== null ? 'Daily outflow' : 'Log a purchase'}
          </Text>
        </Pressable>

        {/* 5. Screen Time */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={onOpenScreenTime || onOpenNewEntry}
          accessibilityLabel="Screen time and digital usage card"
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(255, 82, 82, 0.12)' }]}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.error} />
            </View>
            <Text style={styles.cardDomainLabel}>Screen Time</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.primaryMetric}>
              {screenTime !== undefined && screenTime !== null ? `${screenTime.toFixed(1)}` : '--'}
            </Text>
            <Text style={styles.metricUnit}>hrs</Text>
          </View>

          <View style={styles.tagRow}>
            {socialTime !== undefined && socialTime !== null ? (
              <Text style={styles.timeTag}>Social: {Math.round(socialTime * 60)}m</Text>
            ) : null}
          </View>

          <Text style={styles.secondaryDetail}>
            {screenTime !== undefined && screenTime !== null ? 'Digital wellness' : 'Inspect usage'}
          </Text>
        </Pressable>

        {/* 6. Subjective Wellbeing */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={onOpenNewEntry}
          accessibilityLabel="Mood and energy rating card"
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(184, 255, 0, 0.12)' }]}>
              <Ionicons name="happy-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardDomainLabel}>Wellbeing</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.primaryMetric}>
              {mood !== undefined && mood !== null ? `${mood}/10` : '--'}
            </Text>
            <Text style={styles.metricUnit}>mood</Text>
          </View>

          <View style={styles.tagRow}>
            {energy !== undefined && energy !== null ? (
              <View style={[styles.pillBadge, { backgroundColor: 'rgba(184, 255, 0, 0.15)' }]}>
                <Text style={[styles.pillBadgeText, { color: colors.primary }]}>
                  ⚡ Energy {energy}/5
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.secondaryDetail}>
            {mood !== undefined && mood !== null ? 'Daily reflection' : 'Rate today\'s feeling'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flex: 1,
    minWidth: '46%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDomainLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 2,
  },
  primaryMetric: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 2,
    marginVertical: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
    minHeight: 20,
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeTag: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  secondaryDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
