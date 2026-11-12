import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="compass-outline" size={48} color={colors.primary} />
        </View>

        <Text style={styles.errorCode}>404</Text>
        <Text style={styles.title}>Lost in Telemetry Space</Text>
        <Text style={styles.subtitle}>
          The screen or route you are looking for does not exist or has been relocated.
        </Text>

        <Link href="/(tabs)/home" asChild>
          <View
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel="Return to LifeLens Dashboard"
          >
            <Ionicons name="home-outline" size={18} color={colors.background} />
            <Text style={styles.actionBtnText}>Return to Dashboard</Text>
          </View>
        </Link>
      </View>
    </>
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
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(184, 255, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.25)',
  },
  errorCode: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: spacing.xxl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.background,
  },
});
