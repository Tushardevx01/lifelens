/**
 * Button – LifeLens UI Primitive
 *
 * Variants: primary | secondary | ghost
 * Sizes:    sm | md | lg
 */

import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { colors }     from '@/src/theme/colors';
import { radius }     from '@/src/theme/radius';
import { spacing }    from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize    = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title:             string;
  onPress:           () => void;
  variant?:          ButtonVariant;
  size?:             ButtonSize;
  loading?:          boolean;
  disabled?:         boolean;
  fullWidth?:        boolean;
  icon?:             ReactNode;
  style?:            StyleProp<ViewStyle>;
  textStyle?:        StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function Button({
  title,
  onPress,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled  = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth   && styles.fullWidth,
        pressed     && styles.pressed,
        isDisabled  && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.background : colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              styles[`${variant}Text`],
              styles[`text_${size}`],
              isDisabled && styles.disabledText,
              icon        ? styles.textWithIcon : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    gap: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },

  // ─── Variants ─────────────────────────────────────────────────
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(184, 255, 61, 0.4)',
  },
  destructive: {
    backgroundColor: 'rgba(255, 99, 109, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 99, 109, 0.35)',
  },
  ghost: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ─── Sizes ────────────────────────────────────────────────────
  size_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    minHeight: 56,
  },

  // ─── Press / disabled states ──────────────────────────────────
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },

  // ─── Text ─────────────────────────────────────────────────────
  text: {
    ...typography.button,
  },
  primaryText: {
    color: colors.background,
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  outlineText: {
    color: colors.primary,
    fontWeight: '700',
  },
  destructiveText: {
    color: colors.error,
    fontWeight: '700',
  },
  ghostText: {
    color: colors.textPrimary,
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 17,
  },
  disabledText: {
    opacity: 0.7,
  },
  textWithIcon: {
    marginLeft: spacing.xs,
  },
});
