/**
 * Pill – LifeLens UI Primitive
 *
 * Rounded pill used for time-range filters, badges, and tags.
 * Active state uses primary accent background.
 */

import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { radius }  from '@/src/theme/radius';
import { spacing } from '@/src/theme/spacing';

type PillProps = {
  label:    string;
  active?:  boolean;
  onPress?: () => void;
  style?:   StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Pill({ label, active = false, onPress, style, accessibilityLabel }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.pill,
        active   && styles.active,
        pressed  && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
  },
  active: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: colors.background,
  },
});
