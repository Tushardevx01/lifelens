/**
 * Input – LifeLens UI Primitive
 *
 * Warm, minimal text input with optional left / right icons,
 * soft focus ring, and clear validation states.
 */

import { ReactNode, useState } from 'react';
import {
  Platform,
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
  variant?:        'dark' | 'light' | 'default';
};

export function Input({
  label,
  icon,
  rightIcon,
  error,
  containerStyle,
  style,
  variant = 'light',
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          variant === 'dark' && { backgroundColor: colors.surfaceSoft },
          focused && styles.focused,
          !!error  && styles.errorBorder,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}

        <TextInput
          style={[
            styles.input,
            icon      ? styles.inputWithIcon      : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
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
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
  },
  focused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    boxShadow: `0px 0px 0px 3px rgba(255, 185, 142, 0.25)`,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  iconContainer: {
    paddingLeft: spacing.lg,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },
  rightIconContainer: {
    paddingRight: spacing.lg,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
    marginLeft: spacing.sm,
    marginTop: 2,
  },
});
