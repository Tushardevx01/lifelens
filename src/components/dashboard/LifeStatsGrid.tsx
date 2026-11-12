/**
 * LifeStatsGrid — Consolidated Life Dashboard Component
 *
 * Displays the 6 essential daily life statistics in clean, warm, pastel cards:
 *   1. Daily Steps & Movement (with goal progress bar)
 *   2. Sleep Duration & Quality (hours, stars, bedtime)
 *   3. Productivity & Focus (deep work hours, tasks completed)
 *   4. Daily Spending & Expenses (amount, category)
 *   5. Screen Time & Digital Habits (total screen, social media)
 *   6. Subjective Wellbeing (mood rating, energy stars)
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
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <Text style={styles.sectionSubtitle}>Tap card to log</Text>
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
            <View style={[styles.iconWrap, { backgroundColor: '#EDF5DC' }]}>
              <Ionicons name="footsteps" size={17} color="#789938" />
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
                  backgroundColor: '#8FB351',
                },
              ]}
            />
          </View>

          <Text style={styles.secondaryDetail}>
            {activeMinutes !== undefined && activeMinutes !== null
              ? `${activeMinutes}m active`
              : '+ Log workout'}
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
            <View style={[styles.iconWrap, { backgroundColor: '#F3EDF9' }]}>
              <Ionicons name="moon" size={17} color="#7E699B" />
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
              <View style={[styles.pillBadge, { backgroundColor: '#EBE3F5' }]}>
                <Text style={[styles.pillBadgeText, { color: '#7E699B' }]}>
                  {sleepQuality}/5 ★
                </Text>
              </View>
            ) : null}
            {bedtime ? (
              <Text style={styles.timeTag}>Bed: {bedtime}</Text>
            ) : null}
          </View>

          <Text style={styles.secondaryDetail}>
            {sleepHours !== undefined && sleepHours !== null ? 'Target: 7–9 hrs' : '+ Log sleep'}
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
            <View style={[styles.iconWrap, { backgroundColor: '#EFF5FA' }]}>
              <Ionicons name="flash" size={17} color="#50769A" />
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
              <View style={[styles.pillBadge, { backgroundColor: '#DFECF6' }]}>
                <Text style={[styles.pillBadgeText, { color: '#50769A' }]}>
                  {tasksCompleted} done
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.secondaryDetail}>
            {deepWorkHours !== undefined && deepWorkHours !== null ? 'Peak focus' : '+ Start timer'}
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
            <View style={[styles.iconWrap, { backgroundColor: '#FFF1E8' }]}>
              <Ionicons name="wallet" size={17} color="#A35C2B" />
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
              <View style={[styles.pillBadge, { backgroundColor: '#FFE4D4' }]}>
                <Text style={[styles.pillBadgeText, { color: '#A35C2B' }]} numberOfLines={1}>
                  {spendCategory}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.secondaryDetail}>
            {dailySpend !== undefined && dailySpend !== null ? 'Daily outflow' : '+ Add spend'}
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
            <View style={[styles.iconWrap, { backgroundColor: '#FDF1F1' }]}>
              <Ionicons name="phone-portrait" size={17} color="#A84545" />
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
            {screenTime !== undefined && screenTime !== null ? 'Digital habits' : '+ Record time'}
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
            <View style={[styles.iconWrap, { backgroundColor: '#FCF6E5' }]}>
              <Ionicons name="happy" size={17} color="#9E7B28" />
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
              <View style={[styles.pillBadge, { backgroundColor: '#F9F0D4' }]}>
                <Text style={[styles.pillBadgeText, { color: '#9E7B28' }]}>
                  ⚡ {energy}/5 energy
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.secondaryDetail}>
            {mood !== undefined && mood !== null ? 'Reflection logged' : '+ Rate feeling'}
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flex: 1,
    minWidth: '46%',
    borderWidth: 1.5,
    borderColor: colors.border,
    boxShadow: '0px 3px 10px rgba(102, 48, 12, 0.04)',
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDomainLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 3,
  },
  primaryMetric: {
    fontSize: 26,
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
    height: 6,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 3,
    marginVertical: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
    minHeight: 22,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeTag: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  secondaryDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
});
