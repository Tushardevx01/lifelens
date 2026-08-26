import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';

export default function InsightsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* Dark Top Section */}
      <View style={styles.topSection}>
        <Text style={styles.headerTitle}>Insights</Text>
      </View>

      {/* White Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>Discover Patterns</Text>
        <Text style={styles.subtitle}>More insights coming soon</Text>
      </View>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textDarkSecondary,
  },
});
