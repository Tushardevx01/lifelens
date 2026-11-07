import { Alert } from 'react-native';
import { router } from 'expo-router';

import { SignUpScreen } from '@/src/features/auth/SignUpScreen';
import { authApi } from '@/src/services/api';

export default function SignUpRoute() {
  const handleSignUp = async (name: string, email: string, password: string) => {
    try {
      await authApi.register(email, password, name);
      router.replace('/(tabs)/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      Alert.alert('Sign up failed', message);
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
