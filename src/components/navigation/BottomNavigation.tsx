import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

type TabId = 'dashboard' | 'new-entry' | 'history' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  activeIcon: string;
}

interface BottomNavigationProps {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
}

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
  { id: 'new-entry', label: 'New Entry', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { id: 'history', label: 'History', icon: 'time-outline', activeIcon: 'time' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
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
              name={(isActive ? tab.activeIcon : tab.icon) as React.ComponentProps<typeof Ionicons>['name']}
              size={24}
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
    gap: 2,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
});
