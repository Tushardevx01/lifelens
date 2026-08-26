import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Card, Button, Input } from '@/src/components/ui';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

type SignUpScreenProps = {
  onSignUp?: (name: string, email: string, password: string) => void;
  onSignIn?: () => void;
};

export function SignUpScreen({
  onSignUp,
  onSignIn,
}: SignUpScreenProps) {
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
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(20)).current;

  // Animated values are stable refs - dependencies don't change
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(cardFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlideAnim, {
        toValue: 0,
        duration: 500,
        delay: 200,
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
  const isFormValid = name.trim() && email.trim() && password.trim() && confirmPassword.trim() && password === confirmPassword;

  return (
    <Screen keyboardAvoid scroll={false} style={{ backgroundColor: colors.background }}>
      <View style={styles.container}>
        
        {/* Branding */}
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
              <Ionicons name="heart" size={40} color={colors.primary} />
              <Ionicons
                name="pulse"
                size={24}
                color={colors.primary}
                style={styles.pulseIcon}
              />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.titleWhite}>Life</Text>
              <Text style={styles.titleGreen}>Lens</Text>
            </View>
            <Text style={styles.aiText}>AI</Text>
            <Text style={styles.subtitle}>AI-powered personal life analytics</Text>
          </View>
        </Animated.View>

        {/* Sign Up Form (White Bottom Sheet) */}
        <Animated.View
          style={[
            styles.signUpSheet,
            {
              opacity: cardFadeAnim,
              transform: [{ translateY: cardSlideAnim }],
            }
          ]}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>Start your analytics journey</Text>
          </View>

          {/* Full Name Input */}
          <Input
            label="Full Name"
            variant="light"
            icon={
              <Ionicons
                name="person-outline"
                size={20}
                color={nameFocused ? colors.primary : colors.textDarkSecondary}
              />
            }
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            accessibilityLabel="Full name"
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
          />

          {/* Email Input */}
          <Input
            label="Email"
            variant="light"
            icon={
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailFocused ? colors.primary : colors.textDarkSecondary}
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

          {/* Password Input */}
          <Input
            label="Password"
            variant="light"
            icon={
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordFocused ? colors.primary : colors.textDarkSecondary}
              />
            }
            rightIcon={
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textDarkSecondary}
                />
              </Pressable>
            }
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            accessibilityLabel="Password"
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />

          {/* Confirm Password Input */}
          <Input
            label="Confirm Password"
            variant="light"
            icon={
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={confirmPasswordFocused ? colors.primary : colors.textDarkSecondary}
              />
            }
            rightIcon={
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textDarkSecondary}
                />
              </Pressable>
            }
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            accessibilityLabel="Confirm password"
            onFocus={() => setConfirmPasswordFocused(true)}
            onBlur={() => setConfirmPasswordFocused(false)}
            error={passwordMismatch ? 'Passwords do not match' : undefined}
          />

          {/* Terms */}
          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          {/* Sign Up Button */}
          <Button
            title="Sign Up"
            onPress={handleSignUp}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!isFormValid}
            accessibilityLabel="Create your account"
          />

          {/* Sign In Link */}
          <View style={styles.signInSection}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <Pressable
              onPress={onSignIn}
              accessibilityLabel="Sign in to your account"
              accessibilityRole="button"
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
  },
  brandingContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  branding: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pulseIcon: {
    marginLeft: -spacing.sm,
    marginTop: -spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleWhite: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  titleGreen: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  aiText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 4,
    marginTop: -spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  signUpSheet: {
    backgroundColor: colors.surfaceLight,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  welcomeSection: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textDark,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textDarkSecondary,
  },
  termsText: {
    fontSize: 12,
    color: colors.textDarkSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  signInText: {
    fontSize: 14,
    color: colors.textDarkSecondary,
  },
  signInLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});
