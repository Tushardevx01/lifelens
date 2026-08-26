/**
 * DashboardHeader – LifeLens Dashboard Component
 *
 * Premium minimal header:
 *   [Avatar]   Good evening, Tushar      [🔔]
 *
 * Keeps breathing room at top; no large traditional nav bar.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius }  from '@/src/theme/radius';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface DashboardHeaderProps {
  name?: string;
  onBellPress?: () => void;
}

export default function DashboardHeader({
  name = 'Tushar',
  onBellPress,
}: DashboardHeaderProps) {
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'short',
    day:     'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatar} accessibilityLabel={`${name}'s avatar`}>
        <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
      </View>

      {/* Greeting */}
      <View style={styles.textBlock}>
        <Text style={styles.greeting}>{getGreeting()}, {name}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>

      {/* Bell */}
      <Pressable
        style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
        onPress={onBellPress}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
        hitSlop={8}
      >
        <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  date: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
