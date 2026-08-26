/**
 * SectionTitle – LifeLens UI Primitive
 *
 * Two-line section header: a label-caps eyebrow + bold title.
 * Used above card groups to create editorial rhythm.
 */

import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors }  from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

type SectionTitleProps = {
  title:     string;
  eyebrow?:  string;
  style?:    StyleProp<ViewStyle>;
};

export function SectionTitle({ title, eyebrow, style }: SectionTitleProps) {
  return (
    <View style={[styles.container, style]}>
      {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
});
