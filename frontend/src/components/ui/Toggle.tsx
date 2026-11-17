/**
 * Toggle – LifeLens UI Primitive
 *
 * Warm, minimal toggle switch designed for editorial wellness aesthetics.
 * Solves cross-platform tint anomalies (including React Native Web's default teal)
 * by strictly applying LifeLens design tokens across iOS, Android, and Web.
 */

import React from 'react';
import { Switch, SwitchProps, StyleProp, ViewStyle } from 'react-native';
import { colors } from '@/src/theme/colors';

export interface ToggleProps extends Omit<SwitchProps, 'trackColor' | 'thumbColor'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  variant?: 'peach' | 'dark' | 'soft';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Toggle({
  value,
  onValueChange,
  variant = 'peach',
  disabled = false,
  style,
  accessibilityLabel,
  ...rest
}: ToggleProps) {
  const config = React.useMemo(() => {
    switch (variant) {
      case 'dark':
        return {
          trackTrue: colors.darkButton,       // #66300C Signature warm dark button
          trackFalse: '#E2DBD5',              // Soft warm muted gray
          thumbTrue: colors.white,            // #FFFFFF Crisp white
          thumbFalse: colors.white,           // #FFFFFF Crisp white
        };
      case 'soft':
        return {
          trackTrue: colors.softPeach,        // #FFEDE1 Inset warm peach
          trackFalse: colors.border,          // #EEE8E5 Subtle off-white card border
          thumbTrue: colors.darkButton,       // #66300C Signature warm dark button
          thumbFalse: colors.textMuted,       // #AAA4A1 Soft muted gray
        };
      case 'peach':
      default:
        return {
          trackTrue: colors.primary,          // #FFB98E Warm peach primary accent
          trackFalse: '#E2DBD5',              // Soft warm muted gray
          thumbTrue: colors.white,            // #FFFFFF Crisp white
          thumbFalse: colors.white,           // #FFFFFF Crisp white
        };
    }
  }, [variant]);

  // Support React Native Web specific activeThumbColor & activeTrackColor props
  // to prevent react-native-web from falling back to hardcoded #009688 (teal)
  const webProps = {
    activeThumbColor: config.thumbTrue,
    activeTrackColor: config.trackTrue,
  };

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{
        false: config.trackFalse,
        true: config.trackTrue,
      }}
      thumbColor={value ? config.thumbTrue : config.thumbFalse}
      ios_backgroundColor={config.trackFalse}
      style={style}
      {...(webProps as Record<string, unknown>)}
      {...rest}
    />
  );
}
