import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface InsightCardProps {
  title: string;
  summary: string;
  whyItMatters: string;
  actionForToday: string;
}

export default function InsightCard({
  title,
  summary,
  whyItMatters,
  actionForToday,
}: InsightCardProps) {
  const [expandedWhy, setExpandedWhy] = useState(false);
  const [expandedAction, setExpandedAction] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={16} color="#8B5CF6" />
          <Text style={styles.headerText}>Today's Insight</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.summary}>{summary}</Text>

        <Pressable
          style={styles.expandable}
          onPress={() => setExpandedWhy(!expandedWhy)}
        >
          <Text style={styles.expandableTitle}>Why It Matters</Text>
          <Ionicons
            name={expandedWhy ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
        {expandedWhy && <Text style={styles.expandableText}>{whyItMatters}</Text>}

        <Pressable
          style={styles.expandable}
          onPress={() => setExpandedAction(!expandedAction)}
        >
          <Text style={styles.expandableTitle}>Action For Today</Text>
          <Ionicons
            name={expandedAction ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
        {expandedAction && (
          <Text style={styles.expandableText}>{actionForToday}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    backgroundColor: '#8B5CF6',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  expandable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandableTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  expandableText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    paddingBottom: spacing.sm,
  },
});
