import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, AppText, Card, Button } from '@/src/components/ui';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const handleLogout = () => {
    router.replace('/login');
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <AppText variant="bodySmall">Welcome back,</AppText>
            <AppText variant="h2">LifeLens AI</AppText>
          </View>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="ghost"
            size="sm"
          />
        </View>

        <Card style={styles.demoCard}>
          <View style={styles.demoIconContainer}>
            <Ionicons name="heart" size={48} color={colors.primary} />
          </View>
          <AppText variant="h3" style={styles.demoTitle}>
            Demo Mode Active
          </AppText>
          <AppText variant="bodySmall" style={styles.demoSubtitle}>
            This is a placeholder dashboard. Real features coming soon.
          </AppText>
        </Card>

        <View style={styles.statsRow}>
          <Card variant="secondary" style={styles.statCard}>
            <AppText variant="caption">Steps Today</AppText>
            <AppText variant="h2" color={colors.primary}>8,432</AppText>
          </Card>
          <Card variant="secondary" style={styles.statCard}>
            <AppText variant="caption">Heart Rate</AppText>
            <AppText variant="h2" color={colors.primary}>72</AppText>
          </Card>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demoCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxxl,
  },
  demoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoTitle: {
    textAlign: 'center',
  },
  demoSubtitle: {
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    gap: spacing.xs,
  },
});
