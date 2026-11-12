import React from 'react';
import { useRouter } from 'expo-router';
import { ChatModal } from '@/src/components/assistant';

export default function ChatScreen() {
  const router = useRouter();

  return (
    <ChatModal
      visible={true}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/home');
        }
      }}
    />
  );
}

