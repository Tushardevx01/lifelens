/**
 * WeeklyDateSelector – LifeLens Dashboard Component
 *
 * Horizontal 7-day strip inspired by the reference design:
 * Rounded pill buttons displaying day initial and date number,
 * with active day highlighted in warm peach / dark brown.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/radius';
import { spacing } from '@/src/theme/spacing';

interface DayItem {
  date: Date;
  dayName: string;
  dayNumber: number;
  dateStr: string;
  isToday: boolean;
}

interface WeeklyDateSelectorProps {
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
}

export default function WeeklyDateSelector({
  selectedDate,
  onSelectDate,
}: WeeklyDateSelectorProps) {
  const days: DayItem[] = React.useMemo(() => {
    const list: DayItem[] = [];
    const today = new Date();
    // Generate current week (Monday to Sunday, or 3 days back to 3 days forward)
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });
      list.push({
        date: d,
        dayName,
        dayNumber: d.getDate(),
        dateStr,
        isToday: offset === 0,
      });
    }
    return list;
  }, []);

  const currentSelected = selectedDate || days.find((d) => d.isToday)?.dateStr || days[3].dateStr;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((item) => {
          const isSelected = item.dateStr === currentSelected;
          return (
            <Pressable
              key={item.dateStr}
              style={({ pressed }) => [
                styles.dayPill,
                isSelected && styles.dayPillActive,
                pressed && styles.dayPillPressed,
              ]}
              onPress={() => onSelectDate?.(item.dateStr)}
              accessibilityRole="button"
              accessibilityLabel={`${item.dayName} ${item.dayNumber}${isSelected ? ', selected' : ''}`}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>
                {item.dayName}
              </Text>
              <View style={[styles.numberCircle, isSelected && styles.numberCircleActive]}>
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberActive]}>
                  {item.dayNumber}
                </Text>
              </View>
              {item.isToday && !isSelected && <View style={styles.todayDot} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  dayPill: {
    width: 44,
    height: 70,
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dayPillActive: {
    backgroundColor: colors.darkButton, // #66300C Signature warm dark brown
    borderColor: colors.darkButton,
    boxShadow: '0px 4px 12px rgba(102, 48, 12, 0.20)',
    elevation: 4,
  },
  dayPillPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayNameActive: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberCircleActive: {
    backgroundColor: '#FFB98E', // Warm peach circle for active day number
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayNumberActive: {
    color: colors.darkButton,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: -2,
  },
});
