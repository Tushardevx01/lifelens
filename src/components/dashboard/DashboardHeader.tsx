import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

export default function DashboardHeader() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconContainer}>
          <Ionicons name="heart" size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.title}>LifeLens AI</Text>
          <Text style={styles.subtitle}>Dashboard</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.date}>{today}</Text>
        <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
