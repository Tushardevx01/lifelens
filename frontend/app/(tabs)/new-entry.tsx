import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { entriesApi } from '@/src/services/api';
import type { DailyEntryCreate } from '@/src/types/api.types';
import { calculateEstimatedLifeScore } from '@/src/utils/lifeScore';
import { NumberStepper } from '@/src/components/entry/NumberStepper';
import { StarRating } from '@/src/components/entry/StarRating';
import { MoodSlider } from '@/src/components/entry/MoodSlider';
import { LiveScoreCard } from '@/src/components/entry/LiveScoreCard';
import { Button } from '@/src/components/ui';

const SPEND_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Utilities',
  'Work & Tools',
  'Other',
];

function getFormattedDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NewEntryScreen() {
  const insets = useSafeAreaInsets();

  // Date selection (default today)
  const todayStr = useMemo(() => getFormattedDate(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getFormattedDate(yesterday);
  }, []);

  const [date, setDate] = useState(todayStr);

  // Sleep
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepQuality, setSleepQuality] = useState(4);
  const [sleepBedtime, setSleepBedtime] = useState('23:00');
  const [restingHeartRate, setRestingHeartRate] = useState(65);

  // Digital
  const [screenTimeHours, setScreenTimeHours] = useState(5.0);
  const [socialMediaHours, setSocialMediaHours] = useState(1.5);
  const [unlockCount, setUnlockCount] = useState(45);

  // Health
  const [steps, setSteps] = useState(8500);
  const [activeMinutes, setActiveMinutes] = useState(45);
  const [caloriesBurned, setCaloriesBurned] = useState(400);

  // Productivity
  const [deepWorkHours, setDeepWorkHours] = useState(4.0);
  const [tasksCompleted, setTasksCompleted] = useState(6);

  // Finance
  const [dailySpend, setDailySpend] = useState(35.0);
  const [spendCategory, setSpendCategory] = useState<string>('Food & Dining');

  // Subjective
  const [moodScore, setMoodScore] = useState(7);
  const [energyLevel, setEnergyLevel] = useState(4);
  const [notes, setNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);

  // Live Life Score Calculation
  const estimatedScore = useMemo(() => {
    return calculateEstimatedLifeScore({
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      screen_time_hours: screenTimeHours,
      steps,
      active_minutes: activeMinutes,
      deep_work_hours: deepWorkHours,
      tasks_completed: tasksCompleted,
      daily_spend: dailySpend,
      mood_score: moodScore,
    });
  }, [
    sleepHours,
    sleepQuality,
    screenTimeHours,
    steps,
    activeMinutes,
    deepWorkHours,
    tasksCompleted,
    dailySpend,
    moodScore,
  ]);

  const handleSubmit = async () => {
    // Validation
    if (socialMediaHours > screenTimeHours) {
      Alert.alert(
        'Validation Error',
        'Social media time cannot exceed total screen time.'
      );
      return;
    }

    if (date > todayStr) {
      Alert.alert('Validation Error', 'Entry date cannot be in the future.');
      return;
    }

    const payload: DailyEntryCreate = {
      date,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      sleep_bedtime: sleepBedtime.trim() || null,
      resting_heart_rate: restingHeartRate > 0 ? restingHeartRate : null,
      screen_time_hours: screenTimeHours,
      social_media_hours: socialMediaHours,
      unlock_count: unlockCount >= 0 ? unlockCount : null,
      steps,
      active_minutes: activeMinutes,
      calories_burned: caloriesBurned,
      deep_work_hours: deepWorkHours,
      tasks_completed: tasksCompleted,
      daily_spend: dailySpend,
      spend_category: spendCategory,
      mood_score: moodScore,
      energy_level: energyLevel,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      await entriesApi.create(payload);
      Alert.alert('Success', 'Daily entry saved successfully!', [
        {
          text: 'View Dashboard',
          onPress: () => router.replace('/(tabs)/home'),
        },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('409') || errMsg.toLowerCase().includes('already exists')) {
        Alert.alert(
          'Entry Exists',
          `An entry for ${date} already exists. Do you want to update it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Update Entry',
              onPress: async () => {
                try {
                  await entriesApi.update(date, payload);
                  Alert.alert('Updated', 'Daily entry updated successfully!', [
                    { text: 'OK', onPress: () => router.replace('/(tabs)/home') },
                  ]);
                } catch (updateErr) {
                  const uMsg = updateErr instanceof Error ? updateErr.message : 'Update failed.';
                  Alert.alert('Error', uMsg);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Save Failed', errMsg || 'Could not save entry. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Log Daily Life</Text>
          <Text style={styles.headerSubtitle}>
            Track your habits, evaluate your metrics, and build self-awareness
          </Text>
        </View>

        {/* Date Selector Row */}
        <View style={styles.dateSelectorContainer}>
          <Text style={styles.sectionHeader}>LOGGING DATE</Text>
          <View style={styles.datePillsRow}>
            <Pressable
              onPress={() => setDate(todayStr)}
              style={[styles.datePill, date === todayStr && styles.datePillActive]}
              accessibilityRole="button"
              accessibilityLabel={`Select today's date ${todayStr}`}
              accessibilityState={{ selected: date === todayStr }}
            >
              <Ionicons
                name="today"
                size={16}
                color={date === todayStr ? '#FFFFFF' : colors.primaryText}
              />
              <Text
                style={[
                  styles.datePillText,
                  date === todayStr && styles.datePillTextActive,
                ]}
              >
                Today ({todayStr})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDate(yesterdayStr)}
              style={[styles.datePill, date === yesterdayStr && styles.datePillActive]}
              accessibilityRole="button"
              accessibilityLabel={`Select yesterday's date ${yesterdayStr}`}
              accessibilityState={{ selected: date === yesterdayStr }}
            >
              <Ionicons
                name="time"
                size={16}
                color={date === yesterdayStr ? '#FFFFFF' : colors.primaryText}
              />
              <Text
                style={[
                  styles.datePillText,
                  date === yesterdayStr && styles.datePillTextActive,
                ]}
              >
                Yesterday
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Live Score Preview */}
        <View style={styles.previewContainer}>
          <LiveScoreCard breakdown={estimatedScore} />
        </View>

        {/* SECTION 1: SLEEP */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#F3EDF9' }]}>
              <Ionicons name="moon" size={18} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Sleep & Recovery</Text>
              <Text style={styles.sectionDesc}>30% contribution to Life Score</Text>
            </View>
          </View>

          <View style={styles.card}>
            <NumberStepper
              label="Sleep Duration"
              value={sleepHours}
              min={0}
              max={16}
              step={0.5}
              unit="hrs"
              onChange={setSleepHours}
              helperText="Target: 7–9 hrs"
            />

            <StarRating
              label="Sleep Quality"
              value={sleepQuality}
              onChange={setSleepQuality}
              labels={{
                1: 'Poor / Restless',
                2: 'Light / Interrupted',
                3: 'Moderate',
                4: 'Restful',
                5: 'Deep / Optimal',
              }}
            />

            <View style={styles.bedtimeRow}>
              <Text style={styles.inputLabel}>Bedtime (HH:MM)</Text>
              <TextInput
                style={styles.timeInput}
                value={sleepBedtime}
                onChangeText={setSleepBedtime}
                placeholder="23:00"
                placeholderTextColor={colors.textMuted}
                maxLength={5}
              />
            </View>

            <NumberStepper
              label="Resting Heart Rate"
              value={restingHeartRate}
              min={35}
              max={150}
              step={1}
              unit="bpm"
              onChange={setRestingHeartRate}
              helperText="Resting pulse on waking (normal: 50–80 bpm)"
            />
          </View>
        </View>

        {/* SECTION 2: DIGITAL */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#EFF5FA' }]}>
              <Ionicons name="phone-portrait-outline" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Digital & Distraction</Text>
              <Text style={styles.sectionDesc}>Tracks focus drain & attention limits</Text>
            </View>
          </View>

          <View style={styles.card}>
            <NumberStepper
              label="Total Screen Time"
              value={screenTimeHours}
              min={0}
              max={18}
              step={0.5}
              unit="hrs"
              onChange={(val) => {
                setScreenTimeHours(val);
                if (socialMediaHours > val) setSocialMediaHours(val);
              }}
            />

            <NumberStepper
              label="Social Media Usage"
              value={socialMediaHours}
              min={0}
              max={screenTimeHours}
              step={0.5}
              unit="hrs"
              onChange={setSocialMediaHours}
              helperText={`Cannot exceed ${screenTimeHours} hrs`}
            />

            <NumberStepper
              label="Device Unlocks"
              value={unlockCount}
              min={0}
              max={300}
              step={5}
              unit="times"
              onChange={setUnlockCount}
              helperText="Phone pickups / unlocks today"
            />
          </View>
        </View>

        {/* SECTION 3: HEALTH */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#EDF5DC' }]}>
              <Ionicons name="fitness" size={18} color="#15803D" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Physical Activity</Text>
              <Text style={styles.sectionDesc}>25% contribution to Life Score</Text>
            </View>
          </View>

          <View style={styles.card}>
            <NumberStepper
              label="Daily Steps"
              value={steps}
              min={0}
              max={40000}
              step={500}
              unit="steps"
              onChange={setSteps}
              helperText="Target: 10,000 steps"
            />

            <NumberStepper
              label="Active Workout Time"
              value={activeMinutes}
              min={0}
              max={240}
              step={5}
              unit="mins"
              onChange={setActiveMinutes}
            />

            <NumberStepper
              label="Estimated Calories Burned"
              value={caloriesBurned}
              min={0}
              max={3000}
              step={50}
              unit="kcal"
              onChange={setCaloriesBurned}
            />
          </View>
        </View>

        {/* SECTION 4: PRODUCTIVITY */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#EAF0F6' }]}>
              <Ionicons name="briefcase" size={18} color="#2B6CB0" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Deep Work & Output</Text>
              <Text style={styles.sectionDesc}>25% contribution to Life Score</Text>
            </View>
          </View>

          <View style={styles.card}>
            <NumberStepper
              label="Deep Work Duration"
              value={deepWorkHours}
              min={0}
              max={16}
              step={0.5}
              unit="hrs"
              onChange={setDeepWorkHours}
              helperText="Uninterrupted high-focus hours"
            />

            <NumberStepper
              label="Tasks Completed"
              value={tasksCompleted}
              min={0}
              max={50}
              step={1}
              unit="tasks"
              onChange={setTasksCompleted}
            />
          </View>
        </View>

        {/* SECTION 5: FINANCE */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#FFF1E8' }]}>
              <Ionicons name="wallet" size={18} color="#C05621" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Financial Wellbeing</Text>
              <Text style={styles.sectionDesc}>20% contribution to Life Score</Text>
            </View>
          </View>

          <View style={styles.card}>
            <NumberStepper
              label="Total Daily Spend"
              value={dailySpend}
              min={0}
              max={5000}
              step={5.0}
              isCurrency
              onChange={setDailySpend}
            />

            <Text style={styles.inputLabel}>Primary Spending Category</Text>
            <View style={styles.categoryWrap}>
              {SPEND_CATEGORIES.map((cat) => {
                const isSelected = cat === spendCategory;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setSpendCategory(cat)}
                    style={[
                      styles.categoryPill,
                      isSelected && styles.categoryPillSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Spend category ${cat}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* SECTION 6: SUBJECTIVE */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#FCF6E5' }]}>
              <Ionicons name="heart" size={18} color="#D97706" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Mindset & Reflection</Text>
              <Text style={styles.sectionDesc}>Adjusts Life Score by up to ±5 pts</Text>
            </View>
          </View>

          <View style={styles.card}>
            <MoodSlider
              label="Mood State"
              value={moodScore}
              onChange={setMoodScore}
            />

            <StarRating
              label="Energy Level"
              value={energyLevel}
              onChange={setEnergyLevel}
              labels={{
                1: 'Exhausted',
                2: 'Low',
                3: 'Moderate',
                4: 'High Energy',
                5: 'Peak Performance',
              }}
            />

            <View style={styles.notesContainer}>
              <View style={styles.notesLabelRow}>
                <Text style={styles.inputLabel}>Daily Reflection Notes</Text>
                <Text style={styles.charCount}>{notes.length}/1000</Text>
              </View>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder="What went well today? What drained your energy?"
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={(text) => {
                  if (text.length <= 1000) setNotes(text);
                }}
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title="Save Daily Entry"
            onPress={handleSubmit}
            size="lg"
            variant="primary"
            loading={submitting}
            accessibilityLabel="Save daily habit entry"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  dateSelectorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  datePillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePillActive: {
    backgroundColor: colors.darkButton,
    borderColor: colors.darkButton,
  },
  datePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  datePillTextActive: {
    color: '#FFFFFF',
  },
  previewContainer: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryText,
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: spacing.xs,
  },
  bedtimeRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
    width: 90,
    textAlign: 'center',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillSelected: {
    backgroundColor: colors.darkButton,
    borderColor: colors.darkButton,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  notesContainer: {
    marginTop: spacing.sm,
  },
  notesLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  notesInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.primaryText,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginTop: spacing.xs,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  submitContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
});

