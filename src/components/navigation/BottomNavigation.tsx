import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';

type TabId = 'home' | 'insights' | 'history' | 'profile';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

interface BottomNavigationProps {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
}

const tabs: Tab[] = [
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'insights', label: 'Insights', icon: 'bulb-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
  { id: 'profile', label: 'Profile', icon: 'person-outline' },
];

export default function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={isActive ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
});
