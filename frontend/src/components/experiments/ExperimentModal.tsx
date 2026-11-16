import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { experimentsApi } from '@/src/services/api';
import type { ExperimentCreate, ExperimentTemplate } from '@/src/types/api.types';

interface ExperimentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Partial<ExperimentCreate>;
}

const METRICS = [
  { id: 'sleep_hours', label: 'Sleep Hours', defaultDir: 'INCREASE' },
  { id: 'screen_time_hours', label: 'Screen Time', defaultDir: 'DECREASE' },
  { id: 'deep_work_hours', label: 'Deep Work', defaultDir: 'INCREASE' },
  { id: 'daily_spend', label: 'Daily Spend', defaultDir: 'DECREASE' },
  { id: 'steps', label: 'Daily Steps', defaultDir: 'INCREASE' },
  { id: 'sleep_quality', label: 'Sleep Quality', defaultDir: 'INCREASE' },
];

const DURATIONS = [7, 14, 21, 30];

export function ExperimentModal({
  visible,
  onClose,
  onSuccess,
  initialData,
}: ExperimentModalProps) {
  const [title, setTitle] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [targetMetric, setTargetMetric] = useState('sleep_hours');
  const [desiredDirection, setDesiredDirection] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [interventionRule, setInterventionRule] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [templates, setTemplates] = useState<ExperimentTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        if (initialData.title) setTitle(initialData.title);
        if (initialData.hypothesis) setHypothesis(initialData.hypothesis);
        if (initialData.target_metric) {
          setTargetMetric(initialData.target_metric);
          const found = METRICS.find((m) => m.id === initialData.target_metric);
          if (found) setDesiredDirection(found.defaultDir as 'INCREASE' | 'DECREASE');
        }
        if (initialData.desired_direction) setDesiredDirection(initialData.desired_direction);
        if (initialData.intervention_rule) setInterventionRule(initialData.intervention_rule);
        if (initialData.duration_days) setDurationDays(initialData.duration_days);
      }

      // Fetch templates
      experimentsApi
        .getTemplates()
        .then((data) => setTemplates(data))
        .catch(() => {});
    }
  }, [visible, initialData]);

  const selectMetric = (metricId: string) => {
    setTargetMetric(metricId);
    const found = METRICS.find((m) => m.id === metricId);
    if (found) {
      setDesiredDirection(found.defaultDir as 'INCREASE' | 'DECREASE');
    }
  };

  const applyTemplate = (tpl: ExperimentTemplate) => {
    setTitle(tpl.title);
    setHypothesis(tpl.hypothesis);
    setTargetMetric(tpl.target_metric);
    setDesiredDirection(tpl.desired_direction);
    setInterventionRule(tpl.intervention_rule);
    setDurationDays(tpl.duration_days);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter an experiment title.');
      return;
    }
    if (!interventionRule.trim()) {
      Alert.alert('Required Field', 'Please specify the exact intervention rule you will follow.');
      return;
    }
    if (!hypothesis.trim()) {
      Alert.alert('Required Field', 'Please formulate a hypothesis for what outcome you expect.');
      return;
    }

    try {
      setLoading(true);
      await experimentsApi.create({
        title: title.trim(),
        hypothesis: hypothesis.trim(),
        target_metric: targetMetric,
        desired_direction: desiredDirection,
        intervention_rule: interventionRule.trim(),
        duration_days: durationDays,
        recommendation_source_id: initialData?.recommendation_source_id,
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to launch experiment';
      Alert.alert('Error Launching Experiment', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Launch Behavioral Experiment</Text>
              <Text style={styles.headerSubtitle}>
                Turn insight into a measurable 7-day personal challenge
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close experiment modal"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Quick Templates Selector */}
            {templates.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PRE-BUILT SCIENTIFIC TEMPLATES</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.templateTrack}
                >
                  {templates.map((tpl) => (
                    <Pressable
                      key={tpl.id}
                      style={styles.templateCard}
                      onPress={() => applyTemplate(tpl)}
                      accessibilityRole="button"
                      accessibilityLabel={`Use template ${tpl.title}`}
                    >
                      <Ionicons
                        name={
                          ((tpl.icon_name || 'flask-outline') as React.ComponentProps<
                            typeof Ionicons
                          >['name'])
                        }
                        size={18}
                        color={colors.primary}
                        style={{ marginBottom: 4 }}
                      />
                      <Text style={styles.templateTitle} numberOfLines={2}>
                        {tpl.title}
                      </Text>
                      <Text style={styles.templateCategory}>{tpl.category}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Target Metric Picker */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TARGET METRIC TO MEASURE</Text>
              <View style={styles.pillGrid}>
                {METRICS.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[
                      styles.metricPill,
                      targetMetric === m.id && styles.metricPillActive,
                    ]}
                    onPress={() => selectMetric(m.id)}
                  >
                    <Text
                      style={[
                        styles.metricPillText,
                        targetMetric === m.id && styles.metricPillTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Desired Direction */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DESIRED OUTCOME DIRECTION</Text>
              <View style={styles.directionRow}>
                <Pressable
                  style={[
                    styles.directionBtn,
                    desiredDirection === 'INCREASE' && styles.directionBtnActive,
                  ]}
                  onPress={() => setDesiredDirection('INCREASE')}
                >
                  <Ionicons
                    name="trending-up"
                    size={16}
                    color={desiredDirection === 'INCREASE' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.directionText,
                      desiredDirection === 'INCREASE' && styles.directionTextActive,
                    ]}
                  >
                    Increase Metric (e.g. More Sleep)
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.directionBtn,
                    desiredDirection === 'DECREASE' && styles.directionBtnActive,
                  ]}
                  onPress={() => setDesiredDirection('DECREASE')}
                >
                  <Ionicons
                    name="trending-down"
                    size={16}
                    color={desiredDirection === 'DECREASE' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.directionText,
                      desiredDirection === 'DECREASE' && styles.directionTextActive,
                    ]}
                  >
                    Decrease Metric (e.g. Less Screen Time)
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Duration Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>EXPERIMENT DURATION</Text>
              <View style={styles.durationRow}>
                {DURATIONS.map((days) => (
                  <Pressable
                    key={days}
                    style={[
                      styles.durationPill,
                      durationDays === days && styles.durationPillActive,
                    ]}
                    onPress={() => setDurationDays(days)}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        durationDays === days && styles.durationTextActive,
                      ]}
                    >
                      {days} Days {days === 7 ? '(Standard)' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>EXPERIMENT TITLE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Digital Sunset: 1h Screen-Free Before Bed"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />
            </View>

            {/* Intervention Rule */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DAILY INTERVENTION RULE</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="The exact rule you will adhere to every day, e.g.: Put phone on charger in living room at 22:30."
                placeholderTextColor={colors.textMuted}
                value={interventionRule}
                onChangeText={setInterventionRule}
                multiline
                numberOfLines={2}
                maxLength={500}
              />
            </View>

            {/* Hypothesis */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SCIENTIFIC HYPOTHESIS</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="What do you predict will happen? e.g.: Eliminating late screen stimulation will increase average sleep duration by at least 45 minutes."
                placeholderTextColor={colors.textMuted}
                value={hypothesis}
                onChangeText={setHypothesis}
                multiline
                numberOfLines={3}
                maxLength={1000}
              />
            </View>

            {/* Baseline Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="analytics-outline" size={18} color={colors.darkButton} />
              <Text style={styles.infoText}>
                LifeLens will automatically compute your 14-day baseline distribution prior to start date,
                and calculate Cohen's d effect size once the treatment period concludes.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Submit */}
          <View style={styles.footer}>
            <Pressable
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Launch this experiment"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>Start Experiment</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '92%',
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
  body: {
    maxHeight: 520,
  },
  bodyContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.6,
  },
  templateTrack: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  templateCard: {
    width: 150,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  templateTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryText,
    lineHeight: 16,
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: 10,
    color: colors.secondaryText,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metricPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricPillActive: {
    backgroundColor: '#FFEDE1',
    borderColor: colors.primary,
  },
  metricPillText: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  metricPillTextActive: {
    color: colors.darkButton,
    fontWeight: '700',
  },
  directionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  directionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  directionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFEDE1',
  },
  directionText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '500',
    flex: 1,
  },
  directionTextActive: {
    color: colors.darkButton,
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
  },
  durationPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFEDE1',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  durationTextActive: {
    color: colors.darkButton,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.primaryText,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#EFF5FA',
    borderWidth: 1,
    borderColor: '#D0E4F5',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  infoText: {
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 17,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.xl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.darkButton,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
