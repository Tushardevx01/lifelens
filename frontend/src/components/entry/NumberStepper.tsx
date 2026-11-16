import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/radius';
import { spacing } from '@/src/theme/spacing';

interface NumberStepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  isCurrency?: boolean;
  onChange: (val: number) => void;
  helperText?: string;
}

export function NumberStepper({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  isCurrency = false,
  onChange,
  helperText,
}: NumberStepperProps) {
  const handleDecrement = () => {
    const next = Math.max(min, Math.round((value - step) * 100) / 100);
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, Math.round((value + step) * 100) / 100);
    onChange(next);
  };

  const formatDisplay = (val: number) => {
    if (isCurrency) {
      return `$${val.toFixed(2)}`;
    }
    if (step < 1) {
      return `${val.toFixed(1)} ${unit}`.trim();
    }
    return `${val.toLocaleString()} ${unit}`.trim();
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      </View>

      <View style={styles.controlRow}>
        <Pressable
          onPress={handleDecrement}
          disabled={value <= min}
          style={({ pressed }) => [
            styles.stepButton,
            value <= min && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          accessibilityLabel={`Decrease ${label}`}
          accessibilityRole="button"
        >
          <Ionicons
            name="remove"
            size={20}
            color={value <= min ? colors.textMuted : colors.textPrimary}
          />
        </Pressable>

        <View style={styles.valueDisplay}>
          <Text style={styles.valueText}>{formatDisplay(value)}</Text>
        </View>

        <Pressable
          onPress={handleIncrement}
          disabled={value >= max}
          style={({ pressed }) => [
            styles.stepButton,
            value >= max && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          accessibilityLabel={`Increase ${label}`}
          accessibilityRole="button"
        >
          <Ionicons
            name="add"
            size={20}
            color={value >= max ? colors.textMuted : colors.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  buttonPressed: {
    opacity: 0.7,
    backgroundColor: '#EAE1DC',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  valueDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryText,
  },
});

