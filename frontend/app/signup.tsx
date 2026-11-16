import { Alert } from 'react-native';
import { router } from 'expo-router';

import { SignUpScreen } from '@/src/features/auth/SignUpScreen';
import { authApi } from '@/src/services/api';
import { CONFIG } from '@/src/config';

export default function SignUpRoute() {
  const handleSignUp = async (name: string, email: string, password: string) => {
    try {
      await authApi.register(email, password, name);
      router.replace('/(tabs)/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      const isNetwork =
        message.includes('Network') ||
        message.includes('Failed to fetch') ||
        message.includes('fetch failed') ||
        message.includes('timeout') ||
        message.includes('ECONNREFUSED');

      if (isNetwork) {
        Alert.alert(
          'Backend Not Running',
          `Without backend, no entry.\n\nThe LifeLens backend server is not running or unreachable at ${CONFIG.API_URL}.\n\nPlease start the backend server to create an account.`
        );
      } else {
        Alert.alert('Sign up failed', message);
      }
    }
  };

  const handleSignIn = () => {
    router.back();
  };

  return (
    <SignUpScreen
      onSignUp={handleSignUp}
      onSignIn={handleSignIn}
    />
  );
}
