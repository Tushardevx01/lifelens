import React, { useState } from 'react';
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
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { IconButton } from '@/src/components/ui';
import { telemetryApi } from '@/src/services/api';

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
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

const SOURCES = [
  { id: 'MANUAL', label: 'Manual Entry' },
  { id: 'SMS', label: 'On-Device SMS Alert' },
  { id: 'STATEMENT_CSV', label: 'Bank Statement CSV' },
];

export function TransactionModal({ visible, onClose, onSuccess }: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [source, setSource] = useState('MANUAL');
  const [isDiscretionary, setIsDiscretionary] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setAmount('');
    setMerchant('');
    setCategory('Food & Dining');
    setSource('MANUAL');
    setIsDiscretionary(true);
    setNotes('');
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive purchase amount.');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Missing Merchant', 'Please enter the merchant or payee name.');
      return;
    }

    try {
      setLoading(true);
      await telemetryApi.transactions.create({
        amount: numAmount,
        merchant: merchant.trim(),
        category,
        timestamp: new Date().toISOString(),
        is_discretionary: isDiscretionary,
        source,
        notes: notes.trim() || null,
      });

      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not record transaction.';
      Alert.alert('Save Failed', msg);
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
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Log Transaction</Text>
              <Text style={styles.subtitle}>Track granular spending & discretionary ratios</Text>
            </View>
            <IconButton
              icon="close"
              size={20}
              onPress={onClose}
              accessibilityLabel="Close transaction modal"
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Amount Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
            </View>

            {/* Merchant Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Merchant / Payee</Text>
              <TextInput
                style={styles.textInput}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="e.g. Swiggy, Uber, Amazon"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Category Pills */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pillsContainer}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[styles.pill, isSelected && styles.pillSelected]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Source Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Transaction Source</Text>
              <View style={styles.pillsContainer}>
                {SOURCES.map((s) => {
                  const isSelected = source === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      style={[styles.pill, isSelected && styles.pillSelected]}
                      onPress={() => setSource(s.id)}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Discretionary Toggle */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: spacing.md }}>
                <Text style={styles.toggleTitle}>Discretionary Expense</Text>
                <Text style={styles.toggleDesc}>
                  Non-essential lifestyle purchase (eating out, entertainment, impulse)
                </Text>
              </View>
              <Pressable
                style={[styles.switchTrack, isDiscretionary && styles.switchTrackActive]}
                onPress={() => setIsDiscretionary(!isDiscretionary)}
              >
                <View style={[styles.switchThumb, isDiscretionary && styles.switchThumbActive]} />
              </Pressable>
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="What prompted this purchase?"
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>
          </ScrollView>

          {/* Footer Submit */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.submitText}>Save Transaction</Text>
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    maxHeight: '85%',
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  textInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  notesInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: 'rgba(184, 255, 61, 0.15)',
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  toggleDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textSecondary,
  },
  switchThumbActive: {
    backgroundColor: colors.background,
    alignSelf: 'flex-end',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
