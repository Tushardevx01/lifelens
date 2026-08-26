/**
 * AppText – LifeLens UI Primitive
 *
 * Maps named variants to the design token typography system.
 */

import { ReactNode } from 'react';
import { StyleProp, Text as RNText, TextProps, TextStyle } from 'react-native';

import { colors }     from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

type TextVariant =
  | 'display'
  | 'heroNumber'
  | 'metricNumber'
  | 'h1' | 'h2' | 'h3'
  | 'cardTitle'
  | 'body' | 'bodySmall'
  | 'secondary'
  | 'label' | 'labelCaps' | 'caption';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?:   string;
  children: ReactNode;
  style?:   StyleProp<TextStyle>;
};

export function AppText({
  variant = 'body',
  color,
  children,
  style,
  ...props
}: AppTextProps) {
  const base = typography[variant] ?? typography.body;
  return (
    <RNText
      style={[base, color ? { color } : null, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}

// Convenience shorthands
export const Display    = (p: Omit<AppTextProps, 'variant'>) => <AppText variant="display"      {...p} />;
export const HeroNumber = (p: Omit<AppTextProps, 'variant'>) => <AppText variant="heroNumber"   {...p} />;
export const H1         = (p: Omit<AppTextProps, 'variant'>) => <AppText variant="h1"           {...p} />;
export const H2         = (p: Omit<AppTextProps, 'variant'>) => <AppText variant="h2"           {...p} />;
export const H3         = (p: Omit<AppTextProps, 'variant'>) => <AppText variant="h3"           {...p} />;
export const BodyText   = (p: Omit<AppTextProps, 'variant'>) => <AppText variant="body"         {...p} />;
export const Caption    = (p: Omit<AppTextProps, 'variant'>) => <AppText variant="caption"      {...p} />;
export const LabelCaps  = (p: Omit<AppTextProps, 'variant'>) => <AppText variant="labelCaps"   {...p} />;
