import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface InsightItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

interface InsightsListProps {
  insights?: InsightItem[];
}

const defaultInsights: InsightItem[] = [
  { id: '1', icon: 'moon', title: 'Sleep Pattern', subtitle: 'Your sleep improved by 12%' },
  { id: '2', icon: 'fitness', title: 'Exercise Goal', subtitle: '3 days streak this week' },
  { id: '3', icon: 'wallet', title: 'Spending Alert', subtitle: 'Unusual transaction detected' },
  { id: '4', icon: 'trending-up', title: 'Productivity', subtitle: 'Peak hours: 9-11 AM' },
  { id: '5', icon: 'heart', title: 'Health Score', subtitle: 'Meditation 5 days in a row' },
];

export default function InsightsList({ insights = defaultInsights }: InsightsListProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>All Insights</Text>
      {insights.map((item, index) => (
        <Pressable key={item.id} style={[styles.row, index === insights.length - 1 && styles.lastRow]}>
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon as React.ComponentProps<typeof Ionicons>['name']} size={18} color="#66300C" />
          </View>
          <View style={styles.content}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      ))}
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  itemTitle: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: colors.secondaryText,
    fontSize: 12,
    marginTop: 2,
  },
});
