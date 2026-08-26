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
import { radius } from '@/src/theme/radius';

type LoginScreenProps = {
  onLogin?: (email: string, password: string) => void;
  onDemo?: () => void;
  onRegister?: () => void;
  onForgotPassword?: () => void;
};

export function LoginScreen({
  onLogin,
  onDemo,
  onRegister,
  onForgotPassword,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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

  const handleSignIn = () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    onLogin?.(email.trim(), password);
    setLoading(false);
  };

  const handleDemo = () => {
    onDemo?.();
  };

  return (
    <Screen keyboardAvoid scroll={false} style={{ backgroundColor: colors.background }}>
      <View style={styles.container}>
        
        {/* Branding (Dark Top Half) */}
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

        {/* Login Form (White Bottom Sheet) */}
        <Animated.View
          style={[
            styles.loginSheet,
            {
              opacity: cardFadeAnim,
              transform: [{ translateY: cardSlideAnim }],
            }
          ]}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Log in to continue your journey</Text>
          </View>

          {/* Live Demo Button */}
          <Pressable
            onPress={handleDemo}
            style={({ pressed }) => [
              styles.demoButton,
              pressed && styles.demoButtonPressed,
            ]}
            accessibilityLabel="Explore Live Demo"
            accessibilityRole="button"
          >
            <Text style={styles.demoIcon}>✦</Text>
            <Text style={styles.demoText}>Explore Live Demo (Bypass Login)</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN WITH CREDENTIALS</Text>
            <View style={styles.dividerLine} />
          </View>

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

          {/* Forgot Password */}
          <Pressable
            onPress={onForgotPassword}
            style={styles.forgotPassword}
            accessibilityLabel="Forgot password"
            accessibilityRole="button"
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>

          {/* Sign In Button */}
          <Button
            title="Sign In"
            onPress={handleSignIn}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!email.trim() || !password.trim()}
            accessibilityLabel="Sign in to your account"
          />

          {/* Registration */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Pressable
              onPress={onRegister}
              accessibilityLabel="Register a new account"
              accessibilityRole="button"
            >
              <Text style={styles.registerLink}>Register</Text>
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
  loginSheet: {
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
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textDarkSecondary,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  demoButtonPressed: {
    opacity: 0.8,
    backgroundColor: colors.surfaceLightSecondary,
  },
  demoIcon: {
    fontSize: 16,
    color: colors.primary,
  },
  demoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceLightSecondary, // Light border
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDarkSecondary,
    letterSpacing: 0.5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  registerText: {
    fontSize: 14,
    color: colors.textDarkSecondary,
  },
  registerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});
