import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { IconButton } from '@/src/components/ui';
import type { DailyMorningBriefing } from '@/src/types/api.types';

interface MorningBriefingModalProps {
  visible: boolean;
  briefing?: DailyMorningBriefing | null;
  userName?: string;
  onClose: () => void;
}

export function MorningBriefingModal({
  visible,
  briefing,
  userName = 'Tushar',
  onClose,
}: MorningBriefingModalProps) {
  const insets = useSafeAreaInsets();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);

  if (!briefing) return null;

  const recScore = Number.isFinite(briefing.recovery_score)
    ? Math.round(briefing.recovery_score)
    : null;
  const recTier = briefing.recovery_tier || 'GOOD';

  const tierColor =
    recTier === 'OPTIMAL'
      ? '#2E7D32'
      : recTier === 'GOOD'
        ? '#1D4ED8'
        : recTier === 'MODERATE'
          ? '#D97706'
          : colors.error;

  const displayGreeting = briefing.greeting
    ? briefing.greeting.replace(/Priya/gi, userName)
    : `Good morning, ${userName}!`;

  const formattedDate = (() => {
    try {
      if (!briefing?.date) return '';
      const parts = briefing.date.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return briefing?.date || '';
  })();

  const handleToggleAudio = () => {
    setIsPlayingAudio((prev) => !prev);
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
            <Text style={styles.headerTitle}>Daily Morning Briefing</Text>
            <Text style={styles.headerSubtitle}>{formattedDate}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.iconBtn, isPlayingAudio && styles.iconBtnActive]}
              onPress={handleToggleAudio}
              accessibilityRole="button"
              accessibilityLabel={isPlayingAudio ? 'Stop audio briefing' : 'Play audio briefing'}
            >
              <Ionicons
                name={isPlayingAudio ? 'volume-high' : 'volume-medium-outline'}
                size={20}
                color={isPlayingAudio ? colors.darkButton : colors.textSecondary}
              />
            </Pressable>
            <IconButton
              icon="close"
              size={20}
              onPress={onClose}
              accessibilityLabel="Close morning briefing"
            />
          </View>
        </View>

        {isPlayingAudio && (
          <View style={styles.audioPlayingBar}>
            <Ionicons name="mic" size={14} color={colors.darkButton} />
            <Text style={styles.audioPlayingText}>
              Voice synthesis: reading executive summary and today's action...
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Recovery Score & Readiness */}
          <View style={styles.heroBox}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroGreeting}>{displayGreeting}</Text>
              <Text style={styles.heroDesc}>{briefing.sleep_summary}</Text>
            </View>
            <View style={[styles.scoreDial, { borderColor: tierColor }]}>
              <Text style={[styles.scoreNumber, { color: tierColor }]}>{recScore ?? '—'}</Text>
              <Text style={styles.scoreUnit}>/100</Text>
              <Text style={[styles.tierBadge, { color: tierColor }]}>
                {recTier.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Section 2: Cognitive Focus Windows */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={18} color={colors.darkButton} />
              <Text style={styles.sectionTitle}>Ultradian Focus Windows</Text>
            </View>
            <View style={styles.focusWindowRow}>
              <View style={styles.windowItem}>
                <Text style={styles.windowLabel}>🎯 Peak Cognitive Surge</Text>
                <Text style={styles.windowValue}>{briefing.optimal_focus_window}</Text>
                <Text style={styles.windowNote}>Ideal for complex analytical / deep work</Text>
              </View>
              <View style={styles.windowItem}>
                <Text style={styles.windowLabel}>⚡ Secondary Flow Window</Text>
                <Text style={styles.windowValue}>{briefing.secondary_focus_window}</Text>
                <Text style={styles.windowNote}>Best for coordination & execution</Text>
              </View>
            </View>
          </View>

          {/* Section 3: Behavioral Risk Radar */}
          {briefing.risk_alerts && briefing.risk_alerts.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.orange} />
                <Text style={styles.sectionTitle}>Behavioral Risk Radar</Text>
              </View>
              {briefing.risk_alerts.map((alert, idx) => (
                <View key={idx} style={styles.alertRow}>
                  <View style={styles.alertIconWrap}>
                    <Ionicons
                      name={alert.type === 'WORKOUT_SKIP' ? 'barbell-outline' : 'warning-outline'}
                      size={18}
                      color={alert.severity === 'CRITICAL' ? colors.error : colors.orange}
                    />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertMsg}>{alert.message}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Section 4: Active Experiment Mission */}
          {briefing.experiment_callout && (
            <View style={[styles.sectionCard, styles.experimentCard]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flask" size={18} color={colors.blue} />
                <Text style={[styles.sectionTitle, { color: colors.blue }]}>
                  {briefing.experiment_callout.title}
                </Text>
                <View style={styles.expPill}>
                  <Text style={styles.expPillText}>{briefing.experiment_callout.progress}</Text>
                </View>
              </View>
              <Text style={styles.expRuleText}>
                Rule: &quot;{briefing.experiment_callout.rule}&quot;
              </Text>
              <Text style={styles.expMsgText}>{briefing.experiment_callout.message}</Text>
              <View style={styles.adherenceStatusRow}>
                <Text style={styles.adherenceLabel}>Yesterday&apos;s Adherence:</Text>
                <Text style={styles.adherenceValue}>
                  {briefing.experiment_callout.yesterday_adherence}
                </Text>
              </View>
            </View>
          )}

          {/* Section 5: Today's Action */}
          <View style={styles.actionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={18} color={colors.darkButton} />
              <Text style={styles.sectionTitle}>Micro-Action for Today</Text>
            </View>
            <Text style={styles.actionBody}>{briefing.micro_action}</Text>

            <Pressable
              style={[styles.commitBtn, isCommitted && styles.commitBtnDone]}
              onPress={() => setIsCommitted(true)}
              accessibilityRole="button"
              accessibilityLabel="Commit to today's micro action"
            >
              <Ionicons
                name={isCommitted ? 'checkmark-circle' : 'flag-outline'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.commitBtnText}>
                {isCommitted ? 'Committed for Today ✓' : 'Commit to This Micro-Action'}
              </Text>
            </Pressable>
          </View>
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
  iconBtnActive: {
    backgroundColor: '#FFEDE1',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDE1',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  audioPlayingText: {
    color: colors.darkButton,
    fontSize: 11,
    fontWeight: '600',
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heroBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  heroGreeting: {
    color: colors.primaryText,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  heroDesc: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 19,
  },
  scoreDial: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2.5,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  scoreUnit: {
    fontSize: 10,
    color: colors.secondaryText,
  },
  tierBadge: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
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
    flex: 1,
  },
  focusWindowRow: {
    gap: spacing.md,
  },
  windowItem: {
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  windowLabel: {
    color: colors.darkButton,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  windowValue: {
    color: colors.primaryText,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  windowNote: {
    color: colors.secondaryText,
    fontSize: 11,
  },
  alertRow: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  alertIconWrap: {
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertMsg: {
    color: colors.secondaryText,
    fontSize: 12,
    lineHeight: 17,
  },
  experimentCard: {
    borderColor: colors.border,
  },
  expPill: {
    backgroundColor: '#E8DDF4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  expPillText: {
    color: '#6B21A8',
    fontSize: 11,
    fontWeight: '700',
  },
  expRuleText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  expMsgText: {
    color: colors.secondaryText,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  adherenceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  adherenceLabel: {
    color: colors.secondaryText,
    fontSize: 12,
  },
  adherenceValue: {
    color: colors.darkButton,
    fontSize: 12,
    fontWeight: '700',
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBody: {
    color: colors.primaryText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  commitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.darkButton,
    paddingVertical: 14,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  commitBtnDone: {
    backgroundColor: '#2E7D32',
  },
  commitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

