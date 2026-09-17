import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { mockDashboardData } from '@/src/features/dashboard';
import TrendCard from '@/src/components/dashboard/TrendCard';

interface HistoryEntry {
  id: string;
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  lifeScore: number;
  change?: number;
  highlight: string;
  summary: string;
  tags: {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }[];
}

const HISTORY_ENTRIES: HistoryEntry[] = [
  {
    id: 'entry-1',
    date: '2026-08-25',
    formattedDate: 'Aug 25, 2026',
    dayOfWeek: 'Today',
    lifeScore: 84.5,
    change: 1.5,
    highlight: 'Peak Focus & Sleep Harmony',
    summary:
      'High deep work (5.5 hrs) combined with 8.1 hrs restorative sleep and 8,900 steps. Distraction remained below 45 min.',
    tags: [
      { label: 'Sleep', value: '8.1 hrs', icon: 'moon-outline' },
      { label: 'Deep Work', value: '5.5 hrs', icon: 'briefcase-outline' },
      { label: 'Steps', value: '8,900', icon: 'footsteps-outline' },
      { label: 'Mood', value: '9/10', icon: 'happy-outline' },
    ],
  },
  {
    id: 'entry-2',
    date: '2026-08-24',
    formattedDate: 'Aug 24, 2026',
    dayOfWeek: 'Yesterday',
    lifeScore: 83.0,
    change: 2.0,
    highlight: 'Active Recovery & Consistency',
    summary:
      'Met all cardio targets with a 45-minute evening jog. Sleep debt reduced by 1.2 hrs.',
    tags: [
      { label: 'Sleep', value: '7.8 hrs', icon: 'moon-outline' },
      { label: 'Deep Work', value: '4.2 hrs', icon: 'briefcase-outline' },
      { label: 'Steps', value: '11,200', icon: 'footsteps-outline' },
      { label: 'Mood', value: '8/10', icon: 'happy-outline' },
    ],
  },
  {
    id: 'entry-3',
    date: '2026-08-23',
    formattedDate: 'Aug 23, 2026',
    dayOfWeek: 'Sunday',
    lifeScore: 81.0,
    change: -1.0,
    highlight: 'Rest & Cognitive Reset',
    summary:
      'Screen time spiked in the afternoon (3.8 hrs) accompanied by a late bedtime, but physical recovery was solid.',
    tags: [
      { label: 'Sleep', value: '6.9 hrs', icon: 'moon-outline' },
      { label: 'Deep Work', value: '2.0 hrs', icon: 'briefcase-outline' },
      { label: 'Steps', value: '6,400', icon: 'footsteps-outline' },
      { label: 'Mood', value: '7/10', icon: 'happy-outline' },
    ],
  },
  {
    id: 'entry-4',
    date: '2026-08-22',
    formattedDate: 'Aug 22, 2026',
    dayOfWeek: 'Saturday',
    lifeScore: 82.0,
    change: 6.0,
    highlight: 'Outdoor Vitality',
    summary:
      'Nature hike and social engagement boosted overall emotional valence. Zero alcohol and consistent hydration.',
    tags: [
      { label: 'Sleep', value: '8.4 hrs', icon: 'moon-outline' },
      { label: 'Deep Work', value: '3.0 hrs', icon: 'briefcase-outline' },
      { label: 'Steps', value: '14,300', icon: 'footsteps-outline' },
      { label: 'Mood', value: '9/10', icon: 'happy-outline' },
    ],
  },
  {
    id: 'entry-5',
    date: '2026-08-21',
    formattedDate: 'Aug 21, 2026',
    dayOfWeek: 'Friday',
    lifeScore: 76.0,
    change: -4.0,
    highlight: 'Sprint Deadline & High Stress',
    summary:
      'High work output but late coffee intake pushed sleep onset to 1:30 AM. Identified caffeine sensitivity anomaly.',
    tags: [
      { label: 'Sleep', value: '5.8 hrs', icon: 'moon-outline' },
      { label: 'Deep Work', value: '6.8 hrs', icon: 'briefcase-outline' },
      { label: 'Steps', value: '4,800', icon: 'footsteps-outline' },
      { label: 'Mood', value: '6/10', icon: 'sad-outline' },
    ],
  },
  {
    id: 'entry-6',
    date: '2026-08-20',
    formattedDate: 'Aug 20, 2026',
    dayOfWeek: 'Thursday',
    lifeScore: 80.0,
    change: 2.0,
    highlight: 'Balanced Focus Routine',
    summary:
      'Productive morning deep-work block followed by 30-min reading routine. Consistent energy throughout the afternoon.',
    tags: [
      { label: 'Sleep', value: '7.5 hrs', icon: 'moon-outline' },
      { label: 'Deep Work', value: '5.0 hrs', icon: 'briefcase-outline' },
      { label: 'Steps', value: '8,100', icon: 'footsteps-outline' },
      { label: 'Mood', value: '8/10', icon: 'happy-outline' },
    ],
  },
];

const FILTERS = ['All', 'Top Scores (80+)', 'High Focus'] as const;
type FilterType = (typeof FILTERS)[number];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('All');

  const trendPoints = (mockDashboardData.trendData || []).map((t, index) => ({
    day: t.date || `D${index + 1}`,
    value: t.lifeScore,
  }));

  const filteredEntries = HISTORY_ENTRIES.filter((entry) => {
    if (selectedFilter === 'Top Scores (80+)') return entry.lifeScore >= 80;
    if (selectedFilter === 'High Focus') {
      const deepWorkTag = entry.tags.find((t) => t.label === 'Deep Work');
      const hours = parseFloat(deepWorkTag?.value || '0');
      return hours >= 5.0;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>History</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>7-Day Streak</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Continuous life trajectory & chronological archives
          </Text>
        </View>

        {/* 30-Day Trend Chart */}
        {trendPoints.length > 0 && (
          <TrendCard
            data={trendPoints}
            latestScore={mockDashboardData.lifeScore.overall}
            monthChange="+3.2%"
          />
        )}

        {/* Quick Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>28</Text>
            <Text style={styles.statLabel}>Logs Recorded</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              81.4
            </Text>
            <Text style={styles.statLabel}>Avg Life Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.green }]}>
              84.5
            </Text>
            <Text style={styles.statLabel}>Peak Score</Text>
          </View>
        </View>

        {/* Timeline Header & Filter Pills */}
        <View style={styles.timelineSectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your Timeline</Text>
            <Text style={styles.sectionSubtitle}>
              Daily breakdowns, metrics & personal notes
            </Text>
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                style={[
                  styles.filterPill,
                  selectedFilter === f && styles.filterPillActive,
                ]}
                onPress={() => setSelectedFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === f && styles.filterTextActive,
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Timeline Items */}
        <View style={styles.timelineList}>
          {filteredEntries.map((item, index) => {
            const isLast = index === filteredEntries.length - 1;
            const scoreColor =
              item.lifeScore >= 80 ? colors.primary : colors.orange;

            return (
              <View key={item.id} style={styles.timelineItem}>
                {/* Timeline track line + node */}
                <View style={styles.trackCol}>
                  <View
                    style={[
                      styles.node,
                      { borderColor: scoreColor, backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <View
                      style={[styles.nodeDot, { backgroundColor: scoreColor }]}
                    />
                  </View>
                  {!isLast && <View style={styles.trackLine} />}
                </View>

                {/* Entry Card */}
                <View style={styles.entryCard}>
                  {/* Entry Header */}
                  <View style={styles.entryHeader}>
                    <View>
                      <View style={styles.dateRow}>
                        <Text style={styles.dayOfWeekText}>
                          {item.dayOfWeek}
                        </Text>
                        <Text style={styles.dateDot}>•</Text>
                        <Text style={styles.formattedDateText}>
                          {item.formattedDate}
                        </Text>
                      </View>
                      <Text style={styles.highlightText}>{item.highlight}</Text>
                    </View>

                    {/* Score badge */}
                    <View
                      style={[
                        styles.scoreBadge,
                        { borderColor: `${scoreColor}40` },
                      ]}
                    >
                      <Text style={[styles.scoreValue, { color: scoreColor }]}>
                        {item.lifeScore.toFixed(1)}
                      </Text>
                      {item.change !== undefined && (
                        <Text
                          style={[
                            styles.changeText,
                            {
                              color:
                                item.change >= 0 ? colors.green : colors.red,
                            },
                          ]}
                        >
                          {item.change >= 0 ? `+${item.change}` : item.change}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Summary note */}
                  <Text style={styles.summaryText}>{item.summary}</Text>

                  {/* Metric Tags */}
                  <View style={styles.tagsContainer}>
                    {item.tags.map((tag) => (
                      <View key={tag.label} style={styles.tagPill}>
                        <Ionicons
                          name={tag.icon}
                          size={12}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.tagLabel}>{tag.label}:</Text>
                        <Text style={styles.tagValue}>{tag.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  timelineSectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  timelineList: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  trackCol: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  node: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trackLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  entryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  dayOfWeekText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  dateDot: {
    color: colors.textMuted,
    fontSize: 10,
  },
  formattedDateText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  highlightText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  scoreBadge: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  changeText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  tagValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
