import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, AppText, Card } from '@/src/components/ui';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

export default function AnalyticsScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="h2">Analytics</AppText>

        <Card style={styles.placeholderCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="analytics-outline" size={48} color={colors.primary} />
          </View>
          <AppText variant="h3" style={styles.title}>
            Coming Soon
          </AppText>
          <AppText variant="bodySmall" style={styles.subtitle}>
            Advanced analytics features will be available here.
          </AppText>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.xl,
  },
  placeholderCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
});
