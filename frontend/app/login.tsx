import { Alert } from 'react-native';
import { router } from 'expo-router';

import { LoginScreen } from '@/src/features/auth/LoginScreen';
import { authApi } from '@/src/services/api';

export default function LoginRoute() {
  const handleLogin = async (email: string, password: string) => {
    try {
      await authApi.login(email, password);
      router.replace('/(tabs)/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
    }
  };

  const handleDemo = async () => {
    // Demo login uses seeded credentials from the backend
    try {
      await authApi.login('demo@lifelens.ai', 'Demo123456!');
    } catch {
      // If backend is offline the app falls back to mock data automatically
    }
    router.replace('/(tabs)/home');
  };

  const handleRegister = () => {
    router.push('/signup');
  };

  const handleForgotPassword = async (email?: string) => {
    if (!email) return;
    try {
      await authApi.forgotPassword(email);
      Alert.alert('Check your email', 'If that account exists, a reset link has been sent.');
    } catch {
      Alert.alert('Error', 'Could not send reset email. Please try again.');
    }
  };

  return (
    <LoginScreen
      onLogin={handleLogin}
      onDemo={handleDemo}
      onRegister={handleRegister}
      onForgotPassword={handleForgotPassword}
    />
  );
}
