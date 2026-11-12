import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import type { DailyMorningBriefing } from '@/src/types/api.types';

interface DailyBriefingCardProps {
  briefing?: DailyMorningBriefing;
  userName?: string;
  onOpenMorningModal: () => void;
  onOpenWeeklyModal?: () => void;
}

export function DailyBriefingCard({
  briefing,
  userName = 'Tushar',
  onOpenMorningModal,
  onOpenWeeklyModal,
}: DailyBriefingCardProps) {
  if (!briefing) return null;

  const recScore = Number.isFinite(briefing.recovery_score)
    ? Math.round(briefing.recovery_score)
    : null;
  const recTier = briefing.recovery_tier || 'GOOD';

  const tierColor =
    recTier === 'OPTIMAL'
      ? colors.success
      : recTier === 'GOOD'
        ? colors.primaryText
        : recTier === 'MODERATE'
          ? colors.warning
          : colors.error;

  const tierBg =
    recTier === 'OPTIMAL'
      ? colors.softGreen
      : recTier === 'GOOD'
        ? colors.softPurple
        : recTier === 'MODERATE'
          ? colors.softYellow
          : '#FDE8E8';

  const displayGreeting = briefing.greeting
    ? briefing.greeting.replace(/Priya/gi, userName)
    : `Good morning, ${userName}!`;

  return (
    <View style={styles.card}>
      {/* Top Banner / Greeting */}
      <View style={styles.topRow}>
        <View style={styles.greetingGroup}>
          <View style={styles.sunBadge}>
            <Ionicons name="sunny" size={17} color="#D97706" />
          </View>
          <View>
            <Text style={styles.greetingText}>{displayGreeting}</Text>
            <Text style={styles.dateText}>{briefing.title.replace('Morning Briefing — ', '')}</Text>
          </View>
        </View>

        {/* Recovery Score Pill */}
        <View style={[styles.recoveryBadge, { backgroundColor: tierBg }]}>
          <Text style={[styles.recoveryScoreVal, { color: tierColor }]}>{recScore ?? '—'}</Text>
          <Text style={styles.recoveryScoreMax}>/100</Text>
          <Text style={[styles.recoveryTierText, { color: tierColor }]}>
            {recTier.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Executive Summary */}
      <Text style={styles.summaryText} numberOfLines={2}>
        {briefing.executive_summary}
      </Text>

      {/* Quick Status Chips */}
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Ionicons name="time-outline" size={14} color={colors.primaryText} />
          <Text style={styles.chipText}>Peak: {briefing.optimal_focus_window}</Text>
        </View>

        {briefing.experiment_callout && (
          <View style={[styles.chip, styles.experimentChip]}>
            <Ionicons name="flask-outline" size={14} color="#7C3AED" />
            <Text style={[styles.chipText, { color: '#7C3AED' }]}>
              {briefing.experiment_callout.progress}
            </Text>
          </View>
        )}
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <Pressable
          style={styles.primaryBtn}
          onPress={onOpenMorningModal}
          accessibilityRole="button"
          accessibilityLabel="Read full morning briefing"
        >
          <Ionicons name="newspaper-outline" size={15} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Read Briefing</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={onOpenWeeklyModal}
          accessibilityRole="button"
          accessibilityLabel="Open weekly review story"
        >
          <Ionicons name="calendar-outline" size={15} color={colors.primaryText} />
          <Text style={styles.secondaryBtnText}>Weekly Story</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greetingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sunBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  recoveryBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  recoveryScoreVal: {
    fontSize: 17,
    fontWeight: '800',
  },
  recoveryScoreMax: {
    fontSize: 11,
    color: colors.textMuted,
  },
  recoveryTierText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  summaryText: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 5,
  },
  experimentChip: {
    backgroundColor: colors.softPurple,
  },
  chipText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.darkButton,
    paddingVertical: 11,
    borderRadius: radius.full,
    gap: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 11,
    borderRadius: radius.full,
    gap: 6,
  },
  secondaryBtnText: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: '600',
  },
});

