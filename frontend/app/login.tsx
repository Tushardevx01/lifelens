import React, { useState } from 'react';
import {
  Alert,
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { LoginScreen } from '@/src/features/auth/LoginScreen';
import { authApi } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

export default function LoginRoute() {
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    try {
      await authApi.login(email, password);
      router.replace('/(tabs)/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
    }
  };

  const handleRegister = () => {
    router.push('/signup');
  };

  const handleOpenForgotPassword = (email?: string) => {
    if (email) setResetEmail(email);
    setResetStep(1);
    setResetModalVisible(true);
  };

  const handleRequestResetToken = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your registered account email.');
      return;
    }
    setSubmittingReset(true);
    try {
      const res = (await authApi.forgotPassword(resetEmail.trim())) as {
        message: string;
        reset_token?: string;
      };
      if (res.reset_token) {
        setResetToken(res.reset_token);
        Alert.alert(
          'Reset Token Generated',
          'Token has been pre-filled for local development. Enter your new password below.'
        );
      } else {
        Alert.alert(
          'Check Your Email',
          'If an account with that email exists, reset instructions have been dispatched.'
        );
      }
      setResetStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not request password reset.';
      Alert.alert('Reset Request Error', msg);
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resetToken.trim() || !newPassword.trim()) {
      Alert.alert('Fields Required', 'Please provide both the reset token and your new password.');
      return;
    }
    if (newPassword.trim().length < 8) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }
    setSubmittingReset(true);
    try {
      await authApi.resetPassword(resetToken.trim(), newPassword.trim());
      Alert.alert(
        'Password Updated',
        'Your password has been successfully reset! You can now sign in with your new credentials.'
      );
      setResetModalVisible(false);
      setResetToken('');
      setNewPassword('');
      setResetStep(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed.';
      Alert.alert('Reset Error', msg);
    } finally {
      setSubmittingReset(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LoginScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        onForgotPassword={handleOpenForgotPassword}
      />

      {/* Forgot Password Interactive Modal */}
      <Modal
        visible={resetModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="key" size={18} color="#66300C" />
                <Text style={styles.modalTitle}>Reset Your Password</Text>
              </View>
              <Pressable onPress={() => setResetModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {resetStep === 1 ? (
              <>
                <Text style={styles.modalSubtitle}>
                  Enter the email associated with your LifeLens account to receive a secure recovery token:
                </Text>

                <Text style={styles.inputLabel}>Account Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <View style={styles.modalActionRow}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setResetModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.primaryBtn, submittingReset && { opacity: 0.7 }]}
                    onPress={handleRequestResetToken}
                    disabled={submittingReset}
                  >
                    {submittingReset ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Send Recovery Token</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  Enter your authorization token and choose a strong new password (min. 8 characters):
                </Text>

                <Text style={styles.inputLabel}>Reset Token</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Paste reset token..."
                  placeholderTextColor={colors.textMuted}
                  value={resetToken}
                  onChangeText={setResetToken}
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>New Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />

                <View style={styles.modalActionRow}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setResetStep(1)}
                  >
                    <Text style={styles.cancelBtnText}>Back</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.primaryBtn, submittingReset && { opacity: 0.7 }]}
                    onPress={handleConfirmResetPassword}
                    disabled={submittingReset}
                  >
                    {submittingReset ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Set New Password</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(36, 36, 36, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.primaryText,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
    marginBottom: spacing.sm,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  cancelBtnText: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: colors.darkButton,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
