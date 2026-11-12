/**
 * InsightCard – LifeLens Dashboard Component
 *
 * Premium floating AI insight card.
 * "✦ AI Insight" badge, short text, accent indicator, action arrow.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius }  from '@/src/theme/radius';

interface InsightCardProps {
  title?:         string;
  summary?:       string;
  whyItMatters?:  string;
  action?:        string;
  onStartExperiment?: (insightData: { title: string; action: string; summary: string }) => void;
}

export default function InsightCard({
  title         = "Your sleep quality directly impacts next-day focus",
  summary       = "Days with 7+ hours of sleep show 28% higher productivity scores.",
  whyItMatters  = "Consistent sleep is your strongest predictor of daily performance.",
  action        = "Aim for a consistent bedtime within a 30-minute window tonight.",
  onStartExperiment,
}: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      {/* AI badge */}
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeStar}>✦</Text>
          <Text style={styles.badgeText}>AI Insight</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Summary */}
      <Text style={styles.summary}>{summary}</Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Expandable why/action */}
      <Pressable
        style={styles.expandBtn}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse details' : 'Expand details'}
      >
        <Text style={styles.expandLabel}>
          {expanded ? 'Less detail' : 'Why it matters & action'}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.expandedSection}>
            <Text style={styles.expandedEyebrow}>Why it matters</Text>
            <Text style={styles.expandedText}>{whyItMatters}</Text>
          </View>
          <View style={[styles.expandedSection, styles.actionSection]}>
            <Text style={styles.expandedEyebrow}>Action</Text>
            <View style={styles.actionRow}>
              <Ionicons name="arrow-forward-circle" size={18} color="#66300C" />
              <Text style={styles.actionText}>{action}</Text>
            </View>
            {onStartExperiment && (
              <Pressable
                style={styles.experimentBtn}
                onPress={() => onStartExperiment({ title, action, summary })}
                accessibilityRole="button"
                accessibilityLabel="Test this in a 7-day experiment"
              >
                <Ionicons name="flask-outline" size={15} color="#FFFFFF" />
                <Text style={styles.experimentBtnText}>Test in a 7-Day Experiment</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
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
    borderLeftWidth: 3,
    borderLeftColor: '#FFB98E',
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFEAE0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeStar: {
    fontSize: 12,
    color: '#C05621',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#66300C',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
    lineHeight: 24,
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryText,
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  expandBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  expandedContent: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  expandedSection: {
    gap: spacing.xs,
  },
  expandedEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  expandedText: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 19,
  },
  actionSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  actionText: {
    fontSize: 13,
    color: colors.primaryText,
    lineHeight: 19,
    flex: 1,
  },
  experimentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.darkButton,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  experimentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
