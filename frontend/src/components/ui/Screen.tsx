import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';

type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
  keyboardAvoid?: boolean;
};

export function Screen({ children, style, scroll = true, keyboardAvoid = true }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  const wrapped = (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'left', 'right']}>
      {content}
    </SafeAreaView>
  );

  if (keyboardAvoid) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {wrapped}
      </KeyboardAvoidingView>
    );
  }

  return wrapped;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
