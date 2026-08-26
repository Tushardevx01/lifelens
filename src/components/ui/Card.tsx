/**
 * Card – LifeLens UI Primitive
 *
 * Variants:
 *   default   – standard surface (#17191A)
 *   elevated  – one step higher (#1D1F20)
 *   hero      – large hero card (#1D1F20 + bold border)
 */

import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { radius }  from '@/src/theme/radius';
import { shadows } from '@/src/theme/shadows';
import { spacing } from '@/src/theme/spacing';

type CardVariant = 'default' | 'elevated' | 'hero';

type CardProps = {
  children:   ReactNode;
  style?:     StyleProp<ViewStyle>;
  variant?:   CardVariant;
  noPadding?: boolean;
};

export function Card({
  children,
  style,
  variant    = 'default',
  noPadding  = false,
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        styles[variant],
        !noPadding && styles.padding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  padding: {
    padding: spacing.xxl,
  },
  default: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    ...shadows.md,
  },
  hero: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.hero,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
});
