import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { experimentsApi } from '@/src/services/api';
import type {
  Experiment,
  ExperimentTemplate,
  ActiveExperimentProgress,
  ExperimentCreate,
} from '@/src/types/api.types';

interface ExperimentHubModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenCreate: (initialData?: Partial<ExperimentCreate>) => void;
  onOpenEvaluation: (experimentId: string) => void;
}

type TabType = 'active' | 'templates' | 'history';

export function ExperimentHubModal({
  visible,
  onClose,
  onOpenCreate,
  onOpenEvaluation,
}: ExperimentHubModalProps) {
  const [tab, setTab] = useState<TabType>('active');
  const [activeList, setActiveList] = useState<ActiveExperimentProgress[]>([]);
  const [historyList, setHistoryList] = useState<Experiment[]>([]);
  const [templates, setTemplates] = useState<ExperimentTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [activeData, historyData, tplData] = await Promise.all([
        experimentsApi.getActive().catch(() => []),
        experimentsApi.list('COMPLETED', 1, 20).catch(() => []),
        experimentsApi.getTemplates().catch(() => []),
      ]);
      setActiveList(activeData);
      setHistoryList(historyData);
      setTemplates(tplData);
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleStartTemplate = (tpl: ExperimentTemplate) => {
    onClose();
    onOpenCreate({
      title: tpl.title,
      hypothesis: tpl.hypothesis,
      target_metric: tpl.target_metric,
      desired_direction: tpl.desired_direction,
      intervention_rule: tpl.intervention_rule,
      duration_days: tpl.duration_days,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Experimentation Hub</Text>
              <Text style={styles.headerSubtitle}>
                Design, test & evaluate personal lifestyle interventions
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close hub"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabTrack}>
            <Pressable
              style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
              onPress={() => setTab('active')}
            >
              <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
                Active ({activeList.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, tab === 'templates' && styles.tabBtnActive]}
              onPress={() => setTab('templates')}
            >
              <Text style={[styles.tabText, tab === 'templates' && styles.tabTextActive]}>
                Templates ({templates.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
              onPress={() => setTab('history')}
            >
              <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
                History ({historyList.length})
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* TAB 1: ACTIVE */}
              {tab === 'active' && (
                <>
                  {activeList.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="flask-outline" size={40} color={colors.textMuted} />
                      <Text style={styles.emptyTitle}>No Active Experiments</Text>
                      <Text style={styles.emptySub}>
                        Pick a scientific template or create a custom experiment to test a hypothesis.
                      </Text>
                      <Pressable
                        style={styles.createActionBtn}
                        onPress={() => {
                          onClose();
                          onOpenCreate();
                        }}
                      >
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={styles.createActionText}>Start an Experiment</Text>
                      </Pressable>
                    </View>
                  ) : (
                    activeList.map((item) => (
                      <View key={item.experiment.id} style={styles.activeExpItem}>
                        <View style={styles.expItemHeader}>
                          <Text style={styles.expItemTitle}>{item.experiment.title}</Text>
                          <View style={styles.expDayTag}>
                            <Text style={styles.expDayTagText}>
                              Day {item.current_day}/{item.total_days}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.expItemRule}>
                          Rule: {item.experiment.intervention_rule}
                        </Text>
                        <View style={styles.expStatsRow}>
                          <Text style={styles.expStatItem}>
                            Adherence: {item.current_adherence_rate}%
                          </Text>
                          <Text style={styles.expStatItem}>
                            Baseline: {item.baseline_mean ?? '—'}
                          </Text>
                          <Text style={styles.expStatItem}>
                            Current: {item.current_treatment_mean ?? '—'}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.evalItemBtn}
                          onPress={() => {
                            onClose();
                            onOpenEvaluation(item.experiment.id);
                          }}
                        >
                          <Text style={styles.evalItemBtnText}>Open Statistical Evaluation</Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.darkButton} />
                        </Pressable>
                      </View>
                    ))
                  )}
                </>
              )}

              {/* TAB 2: TEMPLATES */}
              {tab === 'templates' && (
                <View style={styles.templateList}>
                  {templates.map((tpl) => (
                    <View key={tpl.id} style={styles.templateListItem}>
                      <View style={styles.templateHeader}>
                        <View style={styles.tplCategoryPill}>
                          <Text style={styles.tplCategoryText}>{tpl.category}</Text>
                        </View>
                        <Text style={styles.tplDuration}>{tpl.duration_days} Days</Text>
                      </View>
                      <Text style={styles.tplTitle}>{tpl.title}</Text>
                      <Text style={styles.tplRule}>
                        <Text style={{ fontWeight: '700' }}>Rule: </Text>
                        {tpl.intervention_rule}
                      </Text>
                      <Text style={styles.tplRationale}>{tpl.scientific_rationale}</Text>
                      <Pressable
                        style={styles.tplStartBtn}
                        onPress={() => handleStartTemplate(tpl)}
                        accessibilityRole="button"
                        accessibilityLabel={`Start challenge ${tpl.title}`}
                      >
                        <Ionicons name="play" size={14} color="#FFFFFF" />
                        <Text style={styles.tplStartBtnText}>Start This 7-Day Challenge</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* TAB 3: HISTORY */}
              {tab === 'history' && (
                <>
                  {historyList.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="time-outline" size={38} color={colors.textMuted} />
                      <Text style={styles.emptyTitle}>No Completed Experiments Yet</Text>
                      <Text style={styles.emptySub}>
                        Once an experiment concludes, your statistical deltas, verdicts, and reflections are preserved here.
                      </Text>
                    </View>
                  ) : (
                    historyList.map((exp) => (
                      <View key={exp.id} style={styles.historyCard}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyTitle}>{exp.title}</Text>
                          <View
                            style={[
                              styles.verdictBadge,
                              exp.outcome_verdict === 'SUCCESS' && styles.verdictSuccess,
                              exp.outcome_verdict === 'PARTIAL_SUCCESS' && styles.verdictPartial,
                              exp.outcome_verdict === 'NO_EFFECT' && styles.verdictNoEffect,
                            ]}
                          >
                            <Text style={styles.verdictBadgeText}>{exp.outcome_verdict}</Text>
                          </View>
                        </View>
                        <Text style={styles.historyDates}>
                          {exp.start_date} to {exp.end_date} · {exp.duration_days} days
                        </Text>
                        {exp.evaluation_summary && (
                          <Text style={styles.historySummary} numberOfLines={3}>
                            {exp.evaluation_summary}
                          </Text>
                        )}
                        <View style={styles.historyFooter}>
                          <Text style={styles.historyDelta}>
                            Delta: {exp.outcome_delta !== null ? (exp.outcome_delta > 0 ? `+${exp.outcome_delta.toFixed(1)}` : exp.outcome_delta.toFixed(1)) : '—'}
                            {exp.outcome_delta_pct !== null ? ` (${exp.outcome_delta_pct}%)` : ''}
                          </Text>
                          {exp.adopted_as_habit && (
                            <View style={styles.habitBadge}>
                              <Ionicons name="checkmark-circle" size={12} color={colors.green} />
                              <Text style={styles.habitBadgeText}>Adopted as Habit</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          )}

          {/* Footer Action */}
          <View style={styles.footer}>
            <Pressable
              style={styles.newExpBtn}
              onPress={() => {
                onClose();
                onOpenCreate();
              }}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.newExpBtnText}>Create Custom Experiment</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(36, 36, 36, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '94%',
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTrack: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.darkButton,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  tabTextActive: {
    color: colors.darkButton,
    fontWeight: '700',
  },
  centerBox: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  body: {
    maxHeight: 520,
  },
  bodyContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
  },
  emptySub: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
  },
  createActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.darkButton,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  createActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeExpItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  expItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    flex: 1,
  },
  expDayTag: {
    backgroundColor: '#FFEDE1',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  expDayTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.darkButton,
  },
  expItemRule: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  expStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: 4,
  },
  expStatItem: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  evalItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  evalItemBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.darkButton,
  },
  templateList: {
    gap: spacing.md,
  },
  templateListItem: {
    backgroundColor: colors.secondary,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tplCategoryPill: {
    backgroundColor: '#EFF5FA',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tplCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  tplDuration: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  tplTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  tplRule: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  tplRationale: {
    fontSize: 11,
    color: colors.secondaryText,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  tplStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.darkButton,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  tplStartBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyCard: {
    backgroundColor: colors.secondary,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    flex: 1,
  },
  verdictBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  verdictSuccess: {
    backgroundColor: '#EDF5DC',
  },
  verdictPartial: {
    backgroundColor: '#FFEDE1',
  },
  verdictNoEffect: {
    backgroundColor: '#F1E8E3',
  },
  verdictBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryText,
  },
  historyDates: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  historySummary: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 16,
    marginVertical: 2,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  historyDelta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.darkButton,
  },
  habitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  habitBadgeText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  newExpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.darkButton,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  newExpBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
