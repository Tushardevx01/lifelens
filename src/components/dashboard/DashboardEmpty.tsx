import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface DashboardEmptyProps {
  onAddEntry?: () => void;
}

export default function DashboardEmpty({ onAddEntry }: DashboardEmptyProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="analytics-outline" size={64} color={colors.primary} />
      </View>
      <Text style={styles.title}>Start building your Life Score</Text>
      <Text style={styles.description}>
        Add your first entry to begin tracking your sleep, productivity, health, and
        finances. Your personalized insights will appear here.
      </Text>
      <Pressable style={styles.button} onPress={onAddEntry}>
        <Ionicons name="add" size={20} color="#000" />
        <Text style={styles.buttonText}>Add New Entry</Text>
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
