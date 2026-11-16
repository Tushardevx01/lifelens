/**
 * DashboardHeader – LifeLens Dashboard Component
 *
 * Warm, minimal header:
 *   [Avatar -> Profile]   Good morning, {name}      [✨ Ask AI] [🔔 Alerts]
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
  onAvatarPress?: () => void;
  onAiPress?: () => void;
  hasUnreadAlerts?: boolean;
}

export default function DashboardHeader({
  name = 'Tushar',
  onBellPress,
  onAvatarPress,
  onAiPress,
  hasUnreadAlerts = true,
}: DashboardHeaderProps) {
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'short',
    day:     'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Clickable Avatar -> navigates to Profile / Settings */}
      <Pressable
        style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
        onPress={onAvatarPress}
        accessibilityLabel={`${name}'s avatar, tap to view profile`}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
      </Pressable>

      {/* Greeting & Date */}
      <View style={styles.textBlock}>
        <Text style={styles.greeting} numberOfLines={1}>
          {getGreeting()}, {name}
        </Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>

      {/* Interactive AI Companion Button */}
      {onAiPress && (
        <Pressable
          style={({ pressed }) => [styles.aiButton, pressed && styles.aiButtonPressed]}
          onPress={onAiPress}
          accessibilityLabel="Ask LifeLens Gemini AI"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="sparkles" size={14} color={colors.darkButton} />
          <Text style={styles.aiButtonText}>Ask AI</Text>
        </Pressable>
      )}

      {/* Interactive Bell / Alerts button */}
      <Pressable
        style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
        onPress={onBellPress}
        accessibilityLabel="Notifications and lifestyle alerts"
        accessibilityRole="button"
        hitSlop={8}
      >
        <Ionicons name="notifications-outline" size={19} color={colors.textPrimary} />
        {hasUnreadAlerts && <View style={styles.badgeDot} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: '#FFEDE1',
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.darkButton,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFEDE1',
    borderWidth: 1,
    borderColor: '#FFD9C4',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  aiButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  aiButtonText: {
    color: colors.darkButton,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  badgeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
