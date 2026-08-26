/**
 * Input – LifeLens UI Primitive
 *
 * Premium dark-themed text input with optional left / right icons,
 * focus glow, and error state.
 */

import { ReactNode, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors }  from '@/src/theme/colors';
import { radius }  from '@/src/theme/radius';
import { spacing } from '@/src/theme/spacing';

type InputProps = TextInputProps & {
  label?:          string;
  icon?:           ReactNode;
  rightIcon?:      ReactNode;
  error?:          string;
  containerStyle?: StyleProp<ViewStyle>;
  variant?:        'dark' | 'light';
};

export function Input({
  label,
  icon,
  rightIcon,
  error,
  containerStyle,
  style,
  variant = 'dark',
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const isLight = variant === 'light';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, isLight && styles.labelLight]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          isLight && styles.inputWrapperLight,
          focused && styles.focused,
          focused && isLight && styles.focusedLight,
          !!error  && styles.errorBorder,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}

        <TextInput
          style={[
            styles.input,
            isLight && styles.inputLight,
            icon      ? styles.inputWithIcon      : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            style,
          ]}
          placeholderTextColor={isLight ? colors.textDarkSecondary : colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />

        {rightIcon && (
          <View style={styles.rightIconContainer}>{rightIcon}</View>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  labelLight: {
    color: colors.textDarkSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  inputWrapperLight: {
    backgroundColor: colors.surfaceLightSecondary,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 0,
  },
  focusedLight: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  iconContainer: {
    paddingLeft: spacing.md,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  inputLight: {
    color: colors.textDark,
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },
  rightIconContainer: {
    paddingRight: spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: spacing.xs,
  },
});
