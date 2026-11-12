import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { experimentsApi } from '@/src/services/api';
import type { ExperimentEvaluation } from '@/src/types/api.types';

interface ExperimentEvaluationModalProps {
  visible: boolean;
  experimentId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ExperimentEvaluationModal({
  visible,
  experimentId,
  onClose,
  onSuccess,
}: ExperimentEvaluationModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<ExperimentEvaluation | null>(null);
  const [userRating, setUserRating] = useState<number>(5);
  const [userReflection, setUserReflection] = useState('');
  const [adoptAsHabit, setAdoptAsHabit] = useState(true);

  useEffect(() => {
    if (visible && experimentId) {
      setLoading(true);
      experimentsApi
        .evaluate(experimentId)
        .then((res) => {
          setEvaluation(res);
          // Auto-default habit adoption if experiment succeeded
          if (res.outcome_verdict === 'SUCCESS' || res.outcome_verdict === 'PARTIAL_SUCCESS') {
            setAdoptAsHabit(true);
          } else {
            setAdoptAsHabit(false);
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Evaluation failed';
          Alert.alert('Evaluation Error', msg);
        })
        .finally(() => setLoading(false));
    } else {
      setEvaluation(null);
    }
  }, [visible, experimentId]);

  const handleComplete = async () => {
    if (!experimentId) return;
    try {
      setSubmitting(true);
      await experimentsApi.complete(experimentId, {
        user_rating: userRating,
        user_reflection: userReflection.trim(),
        adopt_as_habit: adoptAsHabit,
      });

      Alert.alert(
        'Experiment Finalized',
        adoptAsHabit
          ? 'Great job! This intervention has also been automatically added to your daily tracked habits.'
          : 'Experiment results and personal reflection have been saved to your history.'
      );
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to finalize experiment';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getVerdictTheme = (verdict: string): { bg: string; border: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] } => {
    switch (verdict) {
      case 'SUCCESS':
        return {
          bg: 'rgba(0, 230, 153, 0.12)',
          border: 'rgba(0, 230, 153, 0.40)',
          color: colors.green,
          icon: 'trophy',
        };
      case 'PARTIAL_SUCCESS':
        return {
          bg: 'rgba(0, 229, 255, 0.12)',
          border: 'rgba(0, 229, 255, 0.40)',
          color: colors.primary,
          icon: 'trending-up',
        };
      case 'NEGATIVE':
        return {
          bg: 'rgba(255, 68, 68, 0.12)',
          border: 'rgba(255, 68, 68, 0.40)',
          color: colors.error,
          icon: 'warning',
        };
      case 'NO_EFFECT':
        return {
          bg: 'rgba(150, 150, 150, 0.12)',
          border: 'rgba(150, 150, 150, 0.40)',
          color: colors.textSecondary,
          icon: 'remove-circle-outline',
        };
      default:
        return {
          bg: 'rgba(255, 170, 0, 0.12)',
          border: 'rgba(255, 170, 0, 0.40)',
          color: colors.orange,
          icon: 'help-circle-outline',
        };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Statistical Evaluation</Text>
              <Text style={styles.headerSubtitle}>
                Treatment vs. 14-day baseline comparative analysis
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close evaluation modal"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Computing Welch's t-test & effect sizes...</Text>
            </View>
          ) : !evaluation ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Unable to load statistical evaluation.</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Verdict Banner */}
              {(() => {
                const theme = getVerdictTheme(evaluation.outcome_verdict);
                return (
                  <View
                    style={[
                      styles.verdictBanner,
                      { backgroundColor: theme.bg, borderColor: theme.border },
                    ]}
                  >
                    <Ionicons name={theme.icon} size={22} color={theme.color} />
                    <View style={styles.verdictTextCol}>
                      <Text style={[styles.verdictTitle, { color: theme.color }]}>
                        {evaluation.verdict_label}
                      </Text>
                      <Text style={styles.verdictSubtitle}>
                        Adherence: {evaluation.adherence_rate}% ({evaluation.days_adhered}/{evaluation.total_days_tracked} days adhered)
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Plain-English Statistical Narrative */}
              <View style={styles.synthesisCard}>
                <View style={styles.synthesisHeader}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={styles.synthesisEyebrow}>EVIDENCE-BASED SYNTHESIS</Text>
                </View>
                <Text style={styles.synthesisText}>
                  {evaluation.plain_english_synthesis}
                </Text>
                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationTitle}>Actionable Recommendation:</Text>
                  <Text style={styles.recommendationText}>
                    {evaluation.recommendation_next_steps}
                  </Text>
                </View>
              </View>

              {/* Quantitative Metric Grid */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>QUANTITATIVE DISTRIBUTION METRICS</Text>
                <View style={styles.statsGrid}>
                  {/* Baseline Card */}
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>BASELINE MEAN</Text>
                    <Text style={styles.statBoxValue}>{evaluation.baseline_mean.toFixed(1)}</Text>
                    <Text style={styles.statBoxSub}>
                      ±{evaluation.baseline_std.toFixed(1)} (n={evaluation.baseline_sample_size})
                    </Text>
                  </View>

                  {/* Treatment Card */}
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>TREATMENT MEAN</Text>
                    <Text style={styles.statBoxValue}>{evaluation.treatment_mean.toFixed(1)}</Text>
                    <Text style={styles.statBoxSub}>
                      ±{evaluation.treatment_std.toFixed(1)} (n={evaluation.treatment_sample_size})
                    </Text>
                  </View>

                  {/* Net Delta */}
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>NET DELTA</Text>
                    <Text
                      style={[
                        styles.statBoxValue,
                        {
                          color:
                            evaluation.raw_delta > 0
                              ? evaluation.desired_direction === 'INCREASE'
                                ? colors.green
                                : colors.error
                              : evaluation.desired_direction === 'DECREASE'
                              ? colors.green
                              : colors.error,
                        },
                      ]}
                    >
                      {evaluation.raw_delta > 0 ? '+' : ''}
                      {evaluation.raw_delta.toFixed(1)}
                    </Text>
                    <Text style={styles.statBoxSub}>
                      {evaluation.percentage_change > 0 ? '+' : ''}
                      {evaluation.percentage_change.toFixed(1)}%
                    </Text>
                  </View>

                  {/* Effect Size (Cohen's d) */}
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>EFFECT SIZE (d)</Text>
                    <Text style={styles.statBoxValue}>
                      {evaluation.effect_size_cohens_d.toFixed(2)}
                    </Text>
                    <Text style={styles.statBoxSub}>
                      {Math.abs(evaluation.effect_size_cohens_d) >= 0.8
                        ? 'Large Effect'
                        : Math.abs(evaluation.effect_size_cohens_d) >= 0.5
                        ? 'Moderate Effect'
                        : Math.abs(evaluation.effect_size_cohens_d) >= 0.2
                        ? 'Small Effect'
                        : 'Negligible'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Statistical Rigor Pill */}
              <View style={styles.rigorRow}>
                <Ionicons
                  name={evaluation.is_statistically_significant ? 'shield-checkmark' : 'information-circle'}
                  size={16}
                  color={evaluation.is_statistically_significant ? colors.green : colors.textMuted}
                />
                <Text style={styles.rigorText}>
                  {evaluation.is_statistically_significant
                    ? `Statistically Significant (Welch's p = ${evaluation.p_value ?? '<0.05'})`
                    : `Directional trend noted (p = ${evaluation.p_value ?? 'N/A'}; observe longer)`}
                </Text>
              </View>

              {/* Daily Timeline Dots */}
              {evaluation.daily_comparison.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>DAILY LOG TIMELINE</Text>
                  <View style={styles.timelineRow}>
                    {evaluation.daily_comparison.map((item) => (
                      <View key={item.day} style={styles.dayCol}>
                        <View
                          style={[
                            styles.dot,
                            item.adhered === true && styles.dotAdhered,
                            item.adhered === false && styles.dotMissed,
                            item.adhered === null && styles.dotEmpty,
                          ]}
                        >
                          <Ionicons
                            name={
                              item.adhered === true
                                ? 'checkmark'
                                : item.adhered === false
                                ? 'close'
                                : 'ellipse'
                            }
                            size={10}
                            color={colors.background}
                          />
                        </View>
                        <Text style={styles.dayNum}>D{item.day}</Text>
                        <Text style={styles.dayVal}>
                          {item.metric_value !== null ? item.metric_value.toFixed(1) : '—'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Final Review & Habit Adoption Section */}
              <View style={styles.finalizeSection}>
                <Text style={styles.sectionLabel}>FINAL REVIEW & HABIT ADOPTION</Text>

                {/* Rating Stars */}
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Rate this experiment:</Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => setUserRating(star)}
                        style={styles.starBtn}
                      >
                        <Ionicons
                          name={star <= userRating ? 'star' : 'star-outline'}
                          size={24}
                          color={star <= userRating ? '#FFD700' : colors.textMuted}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Reflection Text */}
                <TextInput
                  style={styles.reflectionInput}
                  placeholder="Personal reflection (How did this routine feel? Was it sustainable?)"
                  placeholderTextColor={colors.textMuted}
                  value={userReflection}
                  onChangeText={setUserReflection}
                  multiline
                  numberOfLines={2}
                />

                {/* Habit Adoption Toggle */}
                <Pressable
                  style={[styles.habitToggleBox, adoptAsHabit && styles.habitToggleBoxActive]}
                  onPress={() => setAdoptAsHabit(!adoptAsHabit)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: adoptAsHabit }}
                >
                  <Ionicons
                    name={adoptAsHabit ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={adoptAsHabit ? colors.primary : colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.habitToggleTitle}>
                      Adopt intervention as a permanent daily habit
                    </Text>
                    <Text style={styles.habitToggleSub}>
                      Automatically tracks this rule in your Daily Habits Matrix with streak tracking.
                    </Text>
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* Footer Complete Button */}
          {evaluation && (
            <View style={styles.footer}>
              <Pressable
                style={styles.footerCancelBtn}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.footerCancelText}>Close</Text>
              </Pressable>

              <Pressable
                style={[styles.footerCompleteBtn, submitting && styles.btnDisabled]}
                onPress={handleComplete}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Finalize and save experiment"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color={colors.background} />
                    <Text style={styles.footerCompleteText}>Finalize & Save</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
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
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 250,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyBox: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  body: {
    maxHeight: 560,
  },
  bodyContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  verdictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  verdictTextCol: {
    flex: 1,
  },
  verdictTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  verdictSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  synthesisCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  synthesisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  synthesisEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  synthesisText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  recommendationBox: {
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    marginTop: spacing.xs,
  },
  recommendationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  recommendationText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBoxLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginVertical: 2,
  },
  statBoxSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  rigorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  rigorText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCol: {
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotAdhered: {
    backgroundColor: colors.green,
  },
  dotMissed: {
    backgroundColor: colors.error,
  },
  dotEmpty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayNum: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  dayVal: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  finalizeSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingLabel: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  starBtn: {
    padding: 2,
  },
  reflectionInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 54,
    textAlignVertical: 'top',
  },
  habitToggleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  habitToggleBoxActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
  },
  habitToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  habitToggleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.xl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  footerCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footerCompleteBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  footerCompleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
});
