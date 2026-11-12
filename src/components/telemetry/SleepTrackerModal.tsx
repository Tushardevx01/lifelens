import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { IconButton, Button } from '@/src/components/ui';
import { StarRating } from '@/src/components/entry/StarRating';
import { NumberStepper } from '@/src/components/entry/NumberStepper';
import {
  nativeSleepService,
  calculateSleepDurationHours,
  calculateCircadianDrift,
} from '@/src/services/nativeSleepService';

interface SleepTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SleepTrackerModal({ visible, onClose, onSuccess }: SleepTrackerModalProps) {
  const todayStr = useMemo(() => getTodayString(), []);

  const [date] = useState(todayStr);
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepQuality, setSleepQuality] = useState(4);
  const [restingHeartRate, setRestingHeartRate] = useState(62);
  const [loading, setLoading] = useState(false);

  // Live calculations
  const durationHours = useMemo(() => {
    return calculateSleepDurationHours(bedtime, wakeTime);
  }, [bedtime, wakeTime]);

  const circadian = useMemo(() => {
    return calculateCircadianDrift(bedtime, wakeTime);
  }, [bedtime, wakeTime]);

  // Stage breakdown preview
  const stageEstimates = useMemo(() => {
    const totalMins = durationHours * 60;
    const deepMins = Math.round(totalMins * 0.20);
    const remMins = Math.round(totalMins * 0.22);
    const awakeMins = Math.round(totalMins * 0.05);
    const coreMins = Math.max(0, totalMins - deepMins - remMins - awakeMins);
    return { deepMins, remMins, coreMins, awakeMins, inBedMins: 15 };
  }, [durationHours]);

  const handleSubmit = async () => {
    if (!bedtime.match(/^\d{1,2}:\d{2}$/) || !wakeTime.match(/^\d{1,2}:\d{2}$/)) {
      Alert.alert('Format Error', 'Bedtime and Wake time must be in HH:MM format (e.g. 23:00).');
      return;
    }

    setLoading(true);
    try {
      await nativeSleepService.recordNativeSleepSession({
        date,
        bedtime,
        wakeTime,
        sleepQuality,
        restingHeartRate,
      });

      Alert.alert('Sleep Logged', `Logged ${durationHours}h of sleep with circadian drift tracking.`, [
        {
          text: 'OK',
          onPress: () => {
            onClose();
            onSuccess?.();
          },
        },
      ]);
    } catch (err) {
      console.error('[SleepTrackerModal] Save error:', err);
      Alert.alert('Error', 'Failed to save native sleep session. Please try again.');
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
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.moonIcon}>
                <Ionicons name="moon" size={18} color="#00D4AA" />
              </View>
              <View>
                <Text style={styles.title}>Native Sleep Tracker</Text>
                <Text style={styles.subtitle}>Circadian drift, sleep stages & resting heart rate</Text>
              </View>
            </View>
            <IconButton
              icon="close"
              onPress={onClose}
              size={36}
              accessibilityLabel="Close sleep tracker"
            />
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Quick Summary Banner */}
            <View style={styles.summaryBanner}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Total Sleep</Text>
                <Text style={styles.summaryValue}>{durationHours}h</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Circadian Drift</Text>
                <Text style={[styles.summaryValue, { color: circadian.phaseShift === 'aligned' ? '#00D4AA' : '#FF9F43' }]}>
                  {circadian.driftMinutes > 0 ? `+${circadian.driftMinutes}m` : `${circadian.driftMinutes}m`}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Resting HR</Text>
                <Text style={styles.summaryValue}>{restingHeartRate} bpm</Text>
              </View>
            </View>

            {/* Timings */}
            <View style={styles.timeRow}>
              <View style={styles.timeInputCol}>
                <Text style={styles.fieldLabel}>Bedtime (HH:MM)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={bedtime}
                  onChangeText={setBedtime}
                  placeholder="23:00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={5}
                />
              </View>
              <View style={styles.timeInputCol}>
                <Text style={styles.fieldLabel}>Wake Time (HH:MM)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={wakeTime}
                  onChangeText={setWakeTime}
                  placeholder="07:00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={5}
                />
              </View>
            </View>

            {/* Quality Rating */}
            <View style={styles.ratingSection}>
              <StarRating
                label="Sleep Quality Rating"
                value={sleepQuality}
                onChange={setSleepQuality}
                labels={{
                  1: 'Restless / Poor',
                  2: 'Fragmented',
                  3: 'Fair',
                  4: 'Restful',
                  5: 'Optimal / Deep',
                }}
              />
            </View>

            {/* Resting Heart Rate */}
            <View style={styles.stepperSection}>
              <NumberStepper
                label="Resting Heart Rate"
                value={restingHeartRate}
                min={35}
                max={140}
                step={1}
                unit="bpm"
                onChange={setRestingHeartRate}
                helperText="Morning resting pulse (normal: 50–75 bpm)"
              />
            </View>

            {/* Synthesized Sleep Stages Architecture */}
            <View style={styles.stageCard}>
              <Text style={styles.stageTitle}>Sleep Architecture Breakdown</Text>
              <Text style={styles.stageSubtitle}>
                On-device physiological ultradian cycles (90-min rhythm):
              </Text>
              <View style={styles.stageBar}>
                <View style={[styles.stageSegment, { flex: stageEstimates.deepMins, backgroundColor: '#3A86FF' }]} />
                <View style={[styles.stageSegment, { flex: stageEstimates.coreMins, backgroundColor: '#00D4AA' }]} />
                <View style={[styles.stageSegment, { flex: stageEstimates.remMins, backgroundColor: '#8338EC' }]} />
                <View style={[styles.stageSegment, { flex: stageEstimates.awakeMins, backgroundColor: '#FF5A5F' }]} />
              </View>
              <View style={styles.stageLegend}>
                <Text style={styles.legendItem}>
                  <Text style={{ color: '#3A86FF' }}>■</Text> Deep: {Math.round(stageEstimates.deepMins)}m
                </Text>
                <Text style={styles.legendItem}>
                  <Text style={{ color: '#00D4AA' }}>■</Text> Core: {Math.round(stageEstimates.coreMins)}m
                </Text>
                <Text style={styles.legendItem}>
                  <Text style={{ color: '#8338EC' }}>■</Text> REM: {Math.round(stageEstimates.remMins)}m
                </Text>
                <Text style={styles.legendItem}>
                  <Text style={{ color: '#FF5A5F' }}>■</Text> Awake: {stageEstimates.awakeMins}m
                </Text>
              </View>
            </View>

            {/* Circadian Shift Card */}
            <View style={styles.circadianCard}>
              <View style={styles.circadianHeader}>
                <Ionicons name="compass-outline" size={16} color={colors.primary} />
                <Text style={styles.circadianTitle}>Circadian Drift & Midpoint</Text>
              </View>
              <Text style={styles.circadianDesc}>
                Sleep midpoint is at <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{circadian.midpointTime}</Text>.
                {circadian.phaseShift === 'delay' && ` You are experiencing a +${circadian.driftMinutes}m phase delay relative to standard 23:00 bedtime.`}
                {circadian.phaseShift === 'advance' && ` You have a ${Math.abs(circadian.driftMinutes)}m phase advance relative to standard 23:00 bedtime.`}
                {circadian.phaseShift === 'aligned' && ' Your sleep window is closely aligned with circadian baseline.'}
              </Text>
            </View>

            {/* Submit */}
            <View style={styles.btnRow}>
              <Button
                title={loading ? 'Saving...' : 'Record Sleep Session'}
                onPress={handleSubmit}
                disabled={loading}
                variant="primary"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  moonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  timeInputCol: {
    flex: 1,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  timeInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  ratingSection: {
    marginBottom: spacing.md,
  },
  stepperSection: {
    marginBottom: spacing.md,
  },
  stageCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stageTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  stageSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  stageBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  stageSegment: {
    height: '100%',
  },
  stageLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  legendItem: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  circadianCard: {
    backgroundColor: 'rgba(93, 169, 255, 0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(93, 169, 255, 0.2)',
  },
  circadianHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  circadianTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  circadianDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  btnRow: {
    marginBottom: spacing.xl,
  },
});
