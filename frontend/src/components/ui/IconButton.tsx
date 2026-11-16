/**
 * IconButton – LifeLens UI Primitive
 *
 * Circular / rounded tappable icon container.  Used in headers, cards, etc.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors }  from '@/src/theme/colors';
import { radius }  from '@/src/theme/radius';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type IconButtonProps = {
  icon:      IoniconsName;
  size?:     number;
  color?:    string;
  onPress?:  () => void;
  style?:    StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function IconButton({
  icon,
  size   = 22,
  color  = colors.textSecondary,
  onPress,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        style,
      ]}
      hitSlop={8}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
