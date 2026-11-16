import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface AnomalyCardProps {
  title?: string;
  description?: string;
  onPress?: () => void;
}

export default function AnomalyCard({
  title = 'Unusual sleep pattern detected',
  description = 'You slept 2 hours less than your average this week',
  onPress,
}: AnomalyCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={18} color={colors.orange} />
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Anomaly detected</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
      <Pressable style={styles.link} onPress={onPress}>
        <Text style={styles.linkText}>View details</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.orange} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.xxl,
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 179, 71, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    color: colors.orange,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xxs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkText: {
    color: colors.orange,
    fontSize: 13,
    fontWeight: '600',
  },
});
