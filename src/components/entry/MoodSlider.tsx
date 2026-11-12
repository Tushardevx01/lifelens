import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/radius';
import { spacing } from '@/src/theme/spacing';

interface MoodSliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

const MOOD_DATA: Record<number, { emoji: string; desc: string }> = {
  1: { emoji: '😫', desc: 'Exhausted' },
  2: { emoji: '😣', desc: 'Struggling' },
  3: { emoji: '😞', desc: 'Down' },
  4: { emoji: '😕', desc: 'Subdued' },
  5: { emoji: '😐', desc: 'Neutral' },
  6: { emoji: '🙂', desc: 'Good' },
  7: { emoji: '😊', desc: 'Positive' },
  8: { emoji: '😁', desc: 'Great' },
  9: { emoji: '🔥', desc: 'Supercharged' },
  10: { emoji: '🤩', desc: 'Peak Flow' },
};

export function MoodSlider({ label, value, onChange }: MoodSliderProps) {
  const current = MOOD_DATA[value] ?? { emoji: '😐', desc: 'Neutral' };
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.feedbackBadge}>
          <Text style={styles.emojiText}>{current.emoji}</Text>
          <Text style={styles.feedbackText}>{value}/10 • {current.desc}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.buttonsTrack}
      >
        {numbers.map((num) => {
          const isSelected = num === value;
          return (
            <Pressable
              key={num}
              onPress={() => onChange(num)}
              style={({ pressed }) => [
                styles.numberPill,
                isSelected && styles.selectedPill,
                pressed && styles.pressedPill,
              ]}
              accessibilityLabel={`Mood score ${num}`}
              accessibilityRole="button"
            >
              <Text style={[styles.numberText, isSelected && styles.selectedNumberText]}>
                {num}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEAE0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#F8D2BD',
  },
  emojiText: {
    fontSize: 14,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#66300C',
  },
  buttonsTrack: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  numberPill: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPill: {
    backgroundColor: colors.darkButton,
    borderColor: colors.darkButton,
  },
  pressedPill: {
    opacity: 0.8,
  },
  numberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondaryText,
  },
  selectedNumberText: {
    color: '#FFFFFF',
  },
});

