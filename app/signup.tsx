import { router } from 'expo-router';

import { SignUpScreen } from '@/src/features/auth/SignUpScreen';

export default function SignUpRoute() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSignUp = (name: string, email: string, password: string) => {
    // TODO: Implement real registration
    router.replace('/(tabs)/home');
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
