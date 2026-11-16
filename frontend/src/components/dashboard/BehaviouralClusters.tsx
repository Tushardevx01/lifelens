import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

interface Cluster {
  label: string;
  color: string;
  active: boolean;
}

interface BehaviouralClustersProps {
  clusters?: Cluster[];
}

const defaultClusters: Cluster[] = [
  { label: 'High Output & Active', color: '#00D4AA', active: true },
  { label: 'Rest & Recovery', color: '#4A9EFF', active: false },
  { label: 'Distracted & Low Energy', color: '#FF9F4A', active: false },
];

export default function BehaviouralClusters({
  clusters = defaultClusters,
}: BehaviouralClustersProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Behavioural Clusters</Text>
      <View style={styles.badgeContainer}>
        {clusters.map((cluster) => (
          <View
            key={cluster.label}
            style={[
              styles.badge,
              cluster.active
                ? { backgroundColor: cluster.color + '20', borderColor: cluster.color }
                : { backgroundColor: 'transparent', borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: cluster.active ? cluster.color : colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.badgeText,
                cluster.active
                  ? { color: cluster.color }
                  : { color: colors.textSecondary },
              ]}
            >
              {cluster.label}
            </Text>
          </View>
        ))}
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
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
