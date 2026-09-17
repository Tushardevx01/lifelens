import { router } from 'expo-router';

import { LoginScreen } from '@/src/features/auth/LoginScreen';

export default function LoginRoute() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLogin = (email: string, password: string) => {
    // TODO: Implement real authentication
    router.replace('/(tabs)/home');
  };

  const handleDemo = () => {
    router.replace('/(tabs)/home');
  };

  const handleRegister = () => {
    router.push('/signup');
  };

  const handleForgotPassword = () => {
    // TODO: Navigate to forgot password screen
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
