import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={32} color={colors.primary} />
        </View>

        <Text style={styles.title}>About LifeLens AI</Text>
        <Text style={styles.badge}>INTELLIGENCE ENGINE v2.4.0</Text>

        <Text style={styles.description}>
          LifeLens correlates biometric telemetry, focus sessions, screen time, and finances to synthesize predictive lifestyle intelligence and personalized behavioral interventions.
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={styles.featureText}>Zero-knowledge privacy & local device encryption</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="analytics" size={18} color="#4A9EFF" />
            <Text style={styles.featureText}>Pearson correlation & behavioural clustering</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="hardware-chip" size={18} color="#A78BFA" />
            <Text style={styles.featureText}>Automated device connectors & SMS parsing</Text>
          </View>
        </View>

        <Pressable
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal"
        >
          <Text style={styles.closeBtnText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#181A1D',
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: '#2A2E33',
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(184, 255, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.25)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  featuresList: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#1E2226',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  featureText: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
  },
});
