import { Tabs } from 'expo-router';
import FloatingTabBar from '@/src/components/navigation/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props: any) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
