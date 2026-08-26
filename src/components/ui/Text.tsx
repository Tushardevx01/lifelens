import { ReactNode } from 'react';
import { StyleProp, Text as RNText, TextProps, TextStyle } from 'react-native';

import { colors } from '@/src/theme/colors';

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'label';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: string;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
};

const variantStyles: Record<TextVariant, TextStyle> = {
  h1: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  h2: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: colors.text },
  h3: { fontSize: 20, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, fontWeight: '400', color: colors.text, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400', color: colors.textSecondary, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', color: colors.textMuted, lineHeight: 16 },
  label: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, letterSpacing: 0.3 },
};

export function AppText({ variant = 'body', color, children, style, ...props }: AppTextProps) {
  return (
    <RNText
      style={[variantStyles[variant], color ? { color } : null, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}
