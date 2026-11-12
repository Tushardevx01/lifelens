import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { entriesApi } from '@/src/services/api';
import type { DailyEntry } from '@/src/types/api.types';
import { calculateEstimatedLifeScore } from '@/src/utils/lifeScore';
import TrendCard from '@/src/components/dashboard/TrendCard';

type TimeRange = '7D' | '30D' | '90D' | 'All';
type ScoreFilter = 'All' | 'Top Scores (80+)' | 'Active Focus (4h+)';

const TIME_RANGES: TimeRange[] = ['7D', '30D', '90D', 'All'];
const SCORE_FILTERS: ScoreFilter[] = ['All', 'Top Scores (80+)', 'Active Focus (4h+)'];

function formatDate(dateStr: string): { formattedDate: string; dayOfWeek: string } {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);

      const today = new Date();
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        yesterday.getFullYear() === year &&
        yesterday.getMonth() === month &&
        yesterday.getDate() === day;

      let dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (isToday) dayOfWeek = 'Today';
      else if (isYesterday) dayOfWeek = 'Yesterday';

      const formattedDate = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return { formattedDate, dayOfWeek };
    }
  } catch {
    // fallback
  }
  return { formattedDate: dateStr, dayOfWeek: '' };
}

function calculateStreak(entries: DailyEntry[]): number {
  if (!entries || entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  const curr = new Date();
  curr.setHours(0, 0, 0, 0);

  for (const entry of sorted) {
    const [y, m, d] = entry.date.split('-').map(Number);
    const entryDate = new Date(y, m - 1, d);
    entryDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((curr.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0 || diffDays === 1) {
      streak += 1;
      curr.setDate(curr.getDate() - 1);
    } else {
      break;
    }
  }
  return Math.max(streak, entries.length > 0 ? 1 : 0);
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('All');

  const fetchEntries = useCallback(async () => {
    try {
      let startStr: string | undefined = undefined;
      const now = new Date();

      if (timeRange === '7D') {
        const d = new Date();
        d.setDate(now.getDate() - 7);
        startStr = d.toISOString().split('T')[0];
      } else if (timeRange === '30D') {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        startStr = d.toISOString().split('T')[0];
      } else if (timeRange === '90D') {
        const d = new Date();
        d.setDate(now.getDate() - 90);
        startStr = d.toISOString().split('T')[0];
      }

      const list = await entriesApi.listAll(startStr);
      setEntries(list || []);
    } catch (err) {
      console.warn('[LifeLens] Failed to load history entries:', err);
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    setLoading(true);
    fetchEntries();
  }, [fetchEntries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEntries();
  };

  const handleDelete = (entryDate: string) => {
    Alert.alert(
      'Delete Entry',
      `Permanently delete daily entry for ${entryDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await entriesApi.delete(entryDate);
              fetchEntries();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Could not delete entry.';
              Alert.alert('Delete failed', msg);
            }
          },
        },
      ]
    );
  };

  // Filtered entries
  const filteredEntries = entries.filter((entry) => {
    const score = calculateEstimatedLifeScore({
      sleep_hours: entry.sleep_hours,
      sleep_quality: entry.sleep_quality,
      screen_time_hours: entry.screen_time_hours,
      steps: entry.steps,
      active_minutes: entry.active_minutes,
      deep_work_hours: entry.deep_work_hours,
      tasks_completed: entry.tasks_completed,
      daily_spend: entry.daily_spend,
      mood_score: entry.mood_score,
    }).life_score;

    if (scoreFilter === 'Top Scores (80+)') return score >= 80;
    if (scoreFilter === 'Active Focus (4h+)') return entry.deep_work_hours >= 4.0;
    return true;
  });

  const trendPoints = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7)
    .map((e, index) => {
      const score = calculateEstimatedLifeScore({
        sleep_hours: e.sleep_hours,
        sleep_quality: e.sleep_quality,
        screen_time_hours: e.screen_time_hours,
        steps: e.steps,
        active_minutes: e.active_minutes,
        deep_work_hours: e.deep_work_hours,
        tasks_completed: e.tasks_completed,
        daily_spend: e.daily_spend,
        mood_score: e.mood_score,
      }).life_score;
      return {
        day: e.date.slice(5) || `D${index + 1}`,
        value: score,
      };
    });

  const streakCount = calculateStreak(entries);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>History</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>
                {streakCount > 0 ? `${streakCount}-Day Streak` : 'No Streak'}
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Review your past logs, spot trends & track daily growth
          </Text>

          {/* Time Range Pills */}
          <View style={styles.rangeRow}>
            {TIME_RANGES.map((r) => (
              <Pressable
                key={r}
                onPress={() => setTimeRange(r)}
                style={[styles.rangePill, timeRange === r && styles.rangePillActive]}
                accessibilityRole="button"
                accessibilityLabel={`Filter history by ${r}`}
                accessibilityState={{ selected: timeRange === r }}
              >
                <Text
                  style={[
                    styles.rangePillText,
                    timeRange === r && styles.rangePillTextActive,
                  ]}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 7-Day Trend Chart */}
        {trendPoints.length > 0 && (
          <View style={styles.trendSection}>
            <TrendCard
              data={trendPoints}
              latestScore={trendPoints[trendPoints.length - 1]?.value}
            />
          </View>
        )}

        {/* Filter Pills */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTrack}
          >
            {SCORE_FILTERS.map((sf) => (
              <Pressable
                key={sf}
                onPress={() => setScoreFilter(sf)}
                style={[
                  styles.filterPill,
                  scoreFilter === sf && styles.filterPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${sf}`}
                accessibilityState={{ selected: scoreFilter === sf }}
              >
                <Text
                  style={[
                    styles.filterText,
                    scoreFilter === sf && styles.filterTextActive,
                  ]}
                >
                  {sf}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Entries List or Loading / Empty States */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading history logs...</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Entries Recorded</Text>
            <Text style={styles.emptySubtitle}>
              {entries.length === 0
                ? "You haven't logged any daily entries yet. Start tracking to unlock your Life Score!"
                : 'No entries matched your active filters.'}
            </Text>
            <Pressable
              style={styles.logButton}
              onPress={() => router.push('/(tabs)/new-entry')}
              accessibilityRole="button"
              accessibilityLabel="Log your daily entry"
            >
              <Ionicons name="add" size={18} color={colors.background} />
              <Text style={styles.logButtonText}>Log Your Day</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {filteredEntries.map((entry) => {
              const { formattedDate, dayOfWeek } = formatDate(entry.date);
              const { life_score, band } = calculateEstimatedLifeScore({
                sleep_hours: entry.sleep_hours,
                sleep_quality: entry.sleep_quality,
                screen_time_hours: entry.screen_time_hours,
                steps: entry.steps,
                active_minutes: entry.active_minutes,
                deep_work_hours: entry.deep_work_hours,
                tasks_completed: entry.tasks_completed,
                daily_spend: entry.daily_spend,
                mood_score: entry.mood_score,
              });

              return (
                <View key={entry.id || entry.date} style={styles.entryCard}>
                  {/* Card Top Row */}
                  <View style={styles.entryTopRow}>
                    <View style={styles.dateInfo}>
                      <Text style={styles.entryDay}>{dayOfWeek}</Text>
                      <Text style={styles.entryDate}>{formattedDate}</Text>
                    </View>

                    <View style={styles.scoreContainer}>
                      <Text style={[styles.scoreNumber, { color: band.color }]}>
                        {life_score.toFixed(1)}
                      </Text>
                      <View style={[styles.bandBadge, { backgroundColor: `${band.color}20` }]}>
                        <Text style={[styles.bandLabel, { color: band.color }]}>
                          {band.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Highlight or Notes */}
                  {entry.notes ? (
                    <Text style={styles.entryNotes} numberOfLines={2}>
                      "{entry.notes}"
                    </Text>
                  ) : null}

                  {/* Metrics Tags Grid */}
                  <View style={styles.tagsGrid}>
                    <View style={styles.tagItem}>
                      <Ionicons name="moon-outline" size={13} color="#00D4AA" />
                      <Text style={styles.tagLabel}>Sleep: {entry.sleep_hours}h</Text>
                    </View>
                    <View style={styles.tagItem}>
                      <Ionicons name="briefcase-outline" size={13} color="#4A9EFF" />
                      <Text style={styles.tagLabel}>Focus: {entry.deep_work_hours}h</Text>
                    </View>
                    <View style={styles.tagItem}>
                      <Ionicons name="footsteps-outline" size={13} color="#B8FF00" />
                      <Text style={styles.tagLabel}>{entry.steps.toLocaleString()} steps</Text>
                    </View>
                    <View style={styles.tagItem}>
                      <Ionicons name="wallet-outline" size={13} color="#FF9F43" />
                      <Text style={styles.tagLabel}>${entry.daily_spend.toFixed(0)}</Text>
                    </View>
                    {entry.mood_score ? (
                      <View style={styles.tagItem}>
                        <Ionicons name="happy-outline" size={13} color="#FF69B4" />
                        <Text style={styles.tagLabel}>Mood: {entry.mood_score}/10</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Actions Row */}
                  <View style={styles.cardActionsRow}>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDelete(entry.date)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete entry for ${formattedDate}`}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
    paddingBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.3)',
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9F43',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rangePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rangePillTextActive: {
    color: colors.background,
  },
  trendSection: {
    marginVertical: spacing.xs,
  },
  filterSection: {
    marginVertical: spacing.sm,
  },
  filterTrack: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.surfaceLight,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
  entriesList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    gap: 2,
  },
  entryDay: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  entryDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  scoreContainer: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  bandBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  bandLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  entryNotes: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  tagLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceElevated,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  deleteText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
