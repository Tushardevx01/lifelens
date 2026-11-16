import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, Button, Input } from '@/src/components/ui';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

type SignUpScreenProps = {
  onSignUp?: (name: string, email: string, password: string) => void;
  onSignIn?: () => void;
};

export function SignUpScreen({
  onSignUp,
  onSignIn,
}: SignUpScreenProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlideAnim, {
        toValue: 0,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignUp = () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) return;
    if (password !== confirmPassword) return;
    setLoading(true);
    onSignUp?.(name.trim(), email.trim(), password);
    setLoading(false);
  };

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isFormValid =
    name.trim() &&
    email.trim() &&
    password.trim().length >= 6 &&
    confirmPassword.trim() &&
    password === confirmPassword;

  return (
    <Screen keyboardAvoid scroll={true} style={{ backgroundColor: colors.background }}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
        
        {/* Branding (Top Section) */}
        <Animated.View
          style={[
            styles.brandingContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.branding}>
            <View style={styles.logoContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="sparkles" size={26} color="#66300C" />
              </View>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.titleWhite}>Life</Text>
              <Text style={styles.titleGreen}>Lens</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Begin your personalized telemetry journey</Text>
          </View>
        </Animated.View>

        {/* SignUp Form Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: cardFadeAnim,
              transform: [{ translateY: cardSlideAnim }],
              paddingBottom: Math.max(insets.bottom, spacing.xxl) + spacing.lg,
            }
          ]}
        >
          {/* Header */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>Unlock automated correlation discovery & behavioral insights</Text>
          </View>

          {/* Full Name */}
          <Input
            label="Full Name"
            variant="default"
            icon={
              <Ionicons
                name="person-outline"
                size={20}
                color={nameFocused ? '#66300C' : colors.textSecondary}
              />
            }
            placeholder="e.g. Priya Sharma"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            accessibilityLabel="Full name"
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
          />

          {/* Email */}
          <Input
            label="Email Address"
            variant="default"
            icon={
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailFocused ? '#66300C' : colors.textSecondary}
              />
            }
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email address"
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />

          {/* Password */}
          <Input
            label="Password"
            variant="default"
            icon={
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordFocused ? '#66300C' : colors.textSecondary}
              />
            }
            rightIcon={
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            }
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            accessibilityLabel="Password"
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />

          {/* Confirm Password */}
          <Input
            label="Confirm Password"
            variant="default"
            error={passwordMismatch ? 'Passwords do not match' : undefined}
            icon={
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={confirmPasswordFocused ? '#66300C' : colors.textSecondary}
              />
            }
            rightIcon={
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            }
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            accessibilityLabel="Confirm Password"
            onFocus={() => setConfirmPasswordFocused(true)}
            onBlur={() => setConfirmPasswordFocused(false)}
          />

          {/* Create Account Button */}
          <Button
            title="Create Account"
            onPress={handleSignUp}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!isFormValid}
            accessibilityLabel="Create your LifeLens account"
            fullWidth
          />

          {/* Sign In Link */}
          <View style={styles.signInSection}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <Pressable
              onPress={onSignIn}
              accessibilityLabel="Sign in to existing account"
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.signInLink}>Sign In</Text>
            </Pressable>
          </View>
        </Animated.View>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  brandingContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  branding: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoContainer: {
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFEAE0',
    borderWidth: 1.5,
    borderColor: '#F8D2BD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  titleWhite: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.8,
  },
  titleGreen: {
    fontSize: 32,
    fontWeight: '800',
    color: '#C05621',
    letterSpacing: -0.8,
  },
  aiBadge: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: '#F5ECE6',
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#66300C',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeSection: {
    gap: 4,
    marginBottom: spacing.xs,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  signInText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  signInLink: {
    fontSize: 14,
    color: '#66300C',
    fontWeight: '800',
  },
});
