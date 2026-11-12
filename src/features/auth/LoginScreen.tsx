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

type LoginScreenProps = {
  onLogin?: (email: string, password: string) => void;
  onDemo?: () => void;
  onRegister?: () => void;
  onForgotPassword?: (email?: string) => void;
};

export function LoginScreen({
  onLogin,
  onDemo,
  onRegister,
  onForgotPassword,
}: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
                <Ionicons name="pulse" size={28} color="#66300C" />
              </View>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.titleWhite}>Life</Text>
              <Text style={styles.titleGreen}>Lens</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Personal lifestyle analytics & AI companion</Text>
          </View>
        </Animated.View>

        {/* Login Form Sheet */}
        <Animated.View
          style={[
            styles.loginSheet,
            {
              opacity: cardFadeAnim,
              transform: [{ translateY: cardSlideAnim }],
              paddingBottom: Math.max(insets.bottom, spacing.xxl) + spacing.lg,
            }
          ]}
        >
          {/* Welcome Header */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to access your daily telemetry and insights</Text>
          </View>

          {/* Quick Demo Access Button */}
          <Pressable
            onPress={handleDemo}
            style={({ pressed }) => [
              styles.demoButton,
              pressed && styles.demoButtonPressed,
            ]}
            accessibilityLabel="Explore Live Demo"
            accessibilityRole="button"
          >
            <Ionicons name="sparkles" size={16} color="#66300C" />
            <Text style={styles.demoText}>Explore Live Demo (Bypass Login)</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN WITH ACCOUNT</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Input */}
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

          {/* Password Input */}
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
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            accessibilityLabel="Password"
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />

          {/* Forgot Password Link */}
          <View style={styles.forgotPasswordRow}>
            <Pressable
              onPress={() => onForgotPassword?.(email.trim())}
              accessibilityLabel="Forgot password"
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>
          </View>

          {/* Primary Action Button */}
          <Button
            title="Sign In"
            onPress={handleSignIn}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!email.trim() || !password.trim()}
            accessibilityLabel="Sign in to your account"
            fullWidth
          />

          {/* Registration Navigation */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Pressable
              onPress={onRegister}
              accessibilityLabel="Register a new account"
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.registerLink}>Create one</Text>
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
    paddingBottom: spacing.xxl,
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
    fontSize: 34,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.8,
  },
  titleGreen: {
    fontSize: 34,
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
  loginSheet: {
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
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  demoButtonPressed: {
    opacity: 0.85,
    backgroundColor: '#EAE1DC',
  },
  demoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#66300C',
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
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginTop: -spacing.xs,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#66300C',
    fontWeight: '700',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  registerText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  registerLink: {
    fontSize: 14,
    color: '#66300C',
    fontWeight: '800',
  },
});
