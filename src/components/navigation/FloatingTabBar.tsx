/**
 * FloatingTabBar – LifeLens Navigation
 *
 * A floating pill-shaped bottom navigation bar that hovers above the screen
 * content.  The active tab gets a filled pill highlight; inactive tabs show
 * just their icon + label in muted color.
 *
 * Usage (in _layout.tsx):
 *   <Tabs tabBar={(props) => <FloatingTabBar {...props} />} />
 */

import React from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors }  from '@/src/theme/colors';
import { radius }  from '@/src/theme/radius';
import { shadows } from '@/src/theme/shadows';
import { spacing } from '@/src/theme/spacing';

type RouteIconMap = Record<string, React.ComponentProps<typeof Ionicons>['name']>;

const ICONS: RouteIconMap = {
  home:        'home-outline',
  index:       'home-outline',
  insights:    'sparkles-outline',
  'new-entry': 'add',
  history:     'time-outline',
  analytics:   'stats-chart-outline',
  two:         'stats-chart-outline',
  settings:    'person-outline',
};

const ACTIVE_ICONS: RouteIconMap = {
  home:        'home',
  index:       'home',
  insights:    'sparkles',
  'new-entry': 'add',
  history:     'time',
  analytics:   'stats-chart',
  two:         'stats-chart',
  settings:    'person',
};

const LABELS: Record<string, string> = {
  home:        'Home',
  index:       'Home',
  insights:    'Insights',
  'new-entry': 'Log Entry',
  history:     'History',
  analytics:   'Analytics',
  two:         'Analytics',
  settings:    'Profile',
};

type TabBarButtonProps = {
  route: any;
  isFocused: boolean;
  onPress: () => void;
};

function TabBarButton({ route, isFocused, onPress }: TabBarButtonProps) {
  const isNewEntry = route.name === 'new-entry';
  const label = LABELS[route.name] ?? route.name;
  const icon = isFocused
    ? (ACTIVE_ICONS[route.name] ?? 'ellipse')
    : (ICONS[route.name] ?? 'ellipse-outline');

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const getIconColor = () => {
    if (isNewEntry) return colors.background;
    return isFocused ? colors.background : colors.textMuted;
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          styles.tabInner,
          isNewEntry && styles.newEntryInner,
          isFocused && (isNewEntry ? styles.newEntryActiveInner : styles.activeTabInner),
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name={icon}
          size={isNewEntry ? 26 : 24}
          color={getIconColor()}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, spacing.lg), pointerEvents: 'box-none' as any },
      ]}
    >
      <View style={styles.pill}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabBarButton
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={handlePress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E', // Very dark grey, almost black
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.float,
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.8)',
    elevation: 20,
    gap: spacing.sm,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24, // Perfect circle
  },
  activeTabInner: {
    backgroundColor: colors.surfaceLight, // White circle
  },
  newEntryInner: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  newEntryActiveInner: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.08 }],
  },
});
