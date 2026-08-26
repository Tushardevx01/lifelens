import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface ProductivityPredictionProps {
  predictedScore?: number;
  keyDriver?: string;
  recommendation?: string;
}

export default function ProductivityPrediction({
  predictedScore = 88,
  keyDriver = 'Consistent morning routine',
  recommendation = 'Try starting work 30 minutes earlier tomorrow',
}: ProductivityPredictionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Productivity Prediction</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Experimental</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.score}>{predictedScore}</Text>
        <Text style={styles.scoreTotal}>/100</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="trending-up" size={16} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Key Driver</Text>
          <Text style={styles.infoText}>{keyDriver}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="bulb-outline" size={16} color="#FFD700" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Recommendation</Text>
          <Text style={styles.infoText}>{recommendation}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#FF9F0020',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: {
    color: '#FF9F00',
    fontSize: 10,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xl,
  },
  score: {
    color: colors.primary,
    fontSize: 44,
    fontWeight: '800',
  },
  scoreTotal: {
    color: colors.textMuted,
    fontSize: 18,
    marginLeft: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoText: {
    color: colors.text,
    fontSize: 14,
  },
});
