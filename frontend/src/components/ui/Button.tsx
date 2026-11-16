/**
 * Button – LifeLens UI Primitive
 *
 * Warm, pill-shaped action buttons with soft transitions.
 * Variants: primary (#66300C) | secondary (#F1E8E3) | ghost | outline | destructive
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
          color={variant === 'primary' ? colors.white : colors.textPrimary}
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
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },

  // ─── Variants ─────────────────────────────────────────────────
  primary: {
    backgroundColor: colors.darkButton, // #66300C Signature warm dark brown
  },
  secondary: {
    backgroundColor: colors.surfaceSoft, // #F1E8E3
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  destructive: {
    backgroundColor: 'rgba(224, 93, 93, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(224, 93, 93, 0.25)',
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // ─── Sizes ────────────────────────────────────────────────────
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 38,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 54,
  },

  // ─── Press / disabled states ──────────────────────────────────
  pressed: {
    opacity: 0.85,
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
    color: colors.white,
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  outlineText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  destructiveText: {
    color: colors.error,
    fontWeight: '700',
  },
  ghostText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 15,
  },
  text_lg: {
    fontSize: 16,
  },
  disabledText: {
    opacity: 0.7,
  },
  textWithIcon: {
    marginLeft: spacing.xs,
  },
});
