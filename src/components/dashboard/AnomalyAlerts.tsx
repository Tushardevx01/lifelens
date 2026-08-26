import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface Alert {
  date: string;
  title: string;
  description: string;
}

interface AnomalyAlertsProps {
  alerts?: Alert[];
}

const defaultAlerts: Alert[] = [
  {
    date: 'Today',
    title: 'Unusual sleep pattern detected',
    description: 'You slept 2 hours less than your average this week',
  },
  {
    date: 'Yesterday',
    title: 'Spike in screen time',
    description: 'Screen time increased by 45% compared to your baseline',
  },
  {
    date: 'Aug 24',
    title: 'Missed workout streak',
    description: 'Your 5-day workout streak was broken',
  },
];

export default function AnomalyAlerts({ alerts = defaultAlerts }: AnomalyAlertsProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="warning" size={18} color="#FF9F4A" />
        <Text style={styles.title}>Anomaly Alerts</Text>
      </View>
      {alerts.map((alert, index) => (
        <View
          key={index}
          style={[styles.row, index === alerts.length - 1 && styles.lastRow]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={16} color="#FF9F4A" />
          </View>
          <View style={styles.content}>
            <Text style={styles.date}>{alert.date}</Text>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertDescription}>{alert.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9F4A15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  date: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  alertTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertDescription: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
