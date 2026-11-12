import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  StatusBar,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { IconButton } from '@/src/components/ui';
import type { WeeklyReviewStory } from '@/src/types/api.types';

interface WeeklyStoryModalProps {
  visible: boolean;
  story?: WeeklyReviewStory | null;
  onClose: () => void;
  onLaunchRecommendedExperiment?: (rec: WeeklyReviewStory['next_week_recommendation']) => void;
}

export function WeeklyStoryModal({
  visible,
  story,
  onClose,
  onLaunchRecommendedExperiment,
}: WeeklyStoryModalProps) {
  const insets = useSafeAreaInsets();
  const [exportedToast, setExportedToast] = useState(false);

  if (!story) return null;

  const avgScore = Number.isFinite(story.avg_life_score)
    ? Math.round(story.avg_life_score)
    : null;
  const delta = story.life_score_trend_delta || 0;
  const deltaSign = delta >= 0 ? '+' : '';

  const handleShare = async () => {
    try {
      await Share.share({
        title: story.title,
        message: `${story.title}\nAverage LifeScore: ${avgScore ?? '—'}/100 (${deltaSign}${delta})\n\nTop Wins:\n${story.top_wins.map((w) => `• ${w}`).join('\n')}\n\nTracked with LifeLens AI.`,
      });
      setExportedToast(true);
      setTimeout(() => setExportedToast(false), 3000);
    } catch {
      // Handled gracefully
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <StatusBar barStyle="dark-content" />

        {/* Modal Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Sunday Evening Review</Text>
            <Text style={styles.headerSubtitle}>
              {story.week_start} – {story.week_end}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconBtn}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share or export weekly review"
            >
              <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
            </Pressable>
            <IconButton
              icon="close"
              size={20}
              onPress={onClose}
              accessibilityLabel="Close weekly story"
            />
          </View>
        </View>

        {exportedToast && (
          <View style={styles.toastBar}>
            <Ionicons name="checkmark-circle" size={14} color={colors.darkButton} />
            <Text style={styles.toastText}>Summary ready to share or export!</Text>
          </View>
        )}

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* LifeScore Banner */}
          <View style={styles.scoreHero}>
            <View>
              <Text style={styles.scoreHeroTitle}>Weekly Average LifeScore</Text>
              <Text style={styles.scoreHeroSubtitle}>
                Synthesized across all 7 days of telemetry
              </Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreHeroValue}>{avgScore ?? '—'}</Text>
              <Text style={styles.scoreHeroDelta}>
                {deltaSign}
                {delta} pts
              </Text>
            </View>
          </View>

          {/* Key Day Highlights */}
          <View style={styles.highlightsGrid}>
            <View style={styles.dayBox}>
              <View style={styles.dayHeader}>
                <Ionicons name="trophy-outline" size={15} color={colors.darkButton} />
                <Text style={styles.dayBoxTitle}>Best Day ({story.best_day.date})</Text>
              </View>
              <Text style={styles.dayBoxText}>{story.best_day.highlight}</Text>
            </View>

            <View style={styles.dayBox}>
              <View style={styles.dayHeader}>
                <Ionicons name="battery-charging-outline" size={15} color="#0D9488" />
                <Text style={[styles.dayBoxTitle, { color: '#0D9488' }]}>
                  Restoration Day ({story.recovery_day.date})
                </Text>
              </View>
              <Text style={styles.dayBoxText}>{story.recovery_day.highlight}</Text>
            </View>
          </View>

          {/* Top Wins */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ribbon-outline" size={18} color={colors.darkButton} />
              <Text style={styles.sectionTitle}>🏆 Top Wins This Week</Text>
            </View>
            {story.top_wins.map((win, idx) => (
              <View key={idx} style={styles.winRow}>
                <Ionicons name="checkmark" size={16} color={colors.darkButton} />
                <Text style={styles.winText}>{win}</Text>
              </View>
            ))}
          </View>

          {/* Behavioral Bottlenecks */}
          {story.bottlenecks_identified && story.bottlenecks_identified.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.orange} />
                <Text style={styles.sectionTitle}>🔍 Behavioral Bottlenecks</Text>
              </View>
              {story.bottlenecks_identified.map((b, idx) => (
                <View key={idx} style={styles.bottleneckRow}>
                  <Ionicons name="warning-outline" size={16} color={colors.orange} />
                  <Text style={styles.bottleneckText}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Next Week's Recommended Challenge */}
          {story.next_week_recommendation && (
            <View style={styles.recCard}>
              <View style={styles.recHeader}>
                <Ionicons name="rocket-outline" size={20} color={colors.darkButton} />
                <Text style={styles.recTitle}>Recommended Next Week Challenge</Text>
              </View>
              <Text style={styles.recChallengeTitle}>
                {story.next_week_recommendation.title}
              </Text>
              <Text style={styles.recRule}>
                Rule: &quot;{story.next_week_recommendation.rule}&quot;
              </Text>
              <Text style={styles.recBenefit}>
                Expected Gain: {story.next_week_recommendation.expected_gain}
              </Text>

              <Pressable
                style={styles.launchBtn}
                onPress={() => onLaunchRecommendedExperiment?.(story.next_week_recommendation)}
                accessibilityRole="button"
                accessibilityLabel="Launch recommended 7-day experiment"
              >
                <Ionicons name="flask" size={16} color="#FFFFFF" />
                <Text style={styles.launchBtnText}>Launch in 7-Day Experiment</Text>
              </Pressable>
            </View>
          )}

          {/* Export summary button */}
          <Pressable
            style={styles.shareBtn}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Export or share weekly story card"
          >
            <Ionicons name="download-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.shareBtnText}>Export Printable HTML / Share Summary</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    color: colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.secondaryText,
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDE1',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  toastText: {
    color: colors.darkButton,
    fontSize: 12,
    fontWeight: '600',
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  scoreHero: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreHeroTitle: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  scoreHeroSubtitle: {
    color: colors.secondaryText,
    fontSize: 12,
    maxWidth: 200,
  },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreHeroValue: {
    color: colors.primaryText,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  scoreHeroDelta: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '700',
  },
  highlightsGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dayBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dayBoxTitle: {
    color: colors.darkButton,
    fontSize: 13,
    fontWeight: '700',
  },
  dayBoxText: {
    color: colors.secondaryText,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  winRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  winText: {
    color: colors.primaryText,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  bottleneckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bottleneckText: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  recCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  recTitle: {
    color: colors.darkButton,
    fontSize: 13,
    fontWeight: '700',
  },
  recChallengeTitle: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
    marginVertical: 4,
  },
  recRule: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  recBenefit: {
    color: colors.secondaryText,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.darkButton,
    paddingVertical: 14,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  launchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: radius.full,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  shareBtnText: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
});

