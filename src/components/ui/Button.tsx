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

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize    = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title:             string;
  onPress:           () => void;
  variant?:          ButtonVariant;
  size?:             ButtonSize;
  loading?:          boolean;
  disabled?:         boolean;
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
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
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

  // ─── Variants ─────────────────────────────────────────────────
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
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
    color: colors.primary,
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
