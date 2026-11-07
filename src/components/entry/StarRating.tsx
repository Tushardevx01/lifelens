import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

interface StarRatingProps {
  label: string;
  value: number;
  maxStars?: number;
  onChange: (val: number) => void;
  labels?: Record<number, string>;
}

const DEFAULT_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Optimal',
};

export function StarRating({
  label,
  value,
  maxStars = 5,
  onChange,
  labels = DEFAULT_LABELS,
}: StarRatingProps) {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.ratingText}>
          {labels[value] ?? `${value}/${maxStars}`}
        </Text>
      </View>

      <View style={styles.starsRow}>
        {stars.map((star) => {
          const filled = star <= value;
          return (
            <Pressable
              key={star}
              onPress={() => onChange(star)}
              hitSlop={8}
              style={({ pressed }) => [styles.starButton, pressed && styles.starPressed]}
              accessibilityLabel={`${label} ${star} of ${maxStars}`}
              accessibilityRole="button"
            >
              <Ionicons
                name={filled ? 'star' : 'star-outline'}
                size={28}
                color={filled ? '#FFD166' : colors.textMuted}
              />
            </Pressable>
          );
        })}
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
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD166',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  starButton: {
    padding: 4,
  },
  starPressed: {
    transform: [{ scale: 1.2 }],
    opacity: 0.8,
  },
});

