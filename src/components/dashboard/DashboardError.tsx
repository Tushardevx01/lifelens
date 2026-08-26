import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface DashboardErrorProps {
  onRetry?: () => void;
}

export default function DashboardError({ onRetry }: DashboardErrorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.orange} />
      </View>
      <Text style={styles.title}>Unable to load your dashboard</Text>
      <Text style={styles.description}>
        Something went wrong while fetching your data. Please check your connection and
        try again.
      </Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Ionicons name="refresh" size={18} color={colors.textPrimary} />
        <Text style={styles.buttonText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 179, 71, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxxl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
