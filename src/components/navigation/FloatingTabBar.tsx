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
import { router, type Tabs } from 'expo-router';

import { colors }  from '@/src/theme/colors';
import { radius }  from '@/src/theme/radius';
import { shadows } from '@/src/theme/shadows';
import { spacing } from '@/src/theme/spacing';

interface NavigationEmitEvent {
  defaultPrevented?: boolean;
}

interface LegacyTabBarNavigation {
  emit: (event: { type: string; target: string; canPreventDefault: boolean }) => NavigationEmitEvent;
  navigate: (routeName: string) => void;
}

interface ModernTabBarProps {
  emitter?: {
    emit: (event: { type: string; target: string; canPreventDefault: boolean }) => NavigationEmitEvent;
  };
  navigateToTab?: (routeKey: string) => void;
}

export type FloatingTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0] & {
  navigation?: LegacyTabBarNavigation;
};

export type TabRoute = FloatingTabBarProps['state']['routes'][number];

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
  route: TabRoute;
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
    return isFocused ? colors.primary : colors.textMuted;
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
          isFocused && !isNewEntry && styles.activeTabInner,
          isFocused && isNewEntry && styles.newEntryActiveInner,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name={icon}
          size={isNewEntry ? 26 : 22}
          color={getIconColor()}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function FloatingTabBar(props: FloatingTabBarProps) {
  const { state, descriptors, navigation } = props;
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((route) => {
    const options = descriptors?.[route.key]?.options as (Record<string, unknown> | undefined);
    if (!options) return true;
    if (options.href === null) return false;
    if (
      typeof options.tabBarItemStyle === 'object' &&
      options.tabBarItemStyle !== null &&
      (options.tabBarItemStyle as Record<string, unknown>).display === 'none'
    ) {
      return false;
    }
    return true;
  });

  return (
    <View
      style={[
        styles.wrapper,
        { pointerEvents: 'box-none', paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
    >
      <View style={styles.pill}>
        {visibleRoutes.map((route: TabRoute) => {
          const isFocused = state.routes[state.index]?.key === route.key;

          const handlePress = () => {
            if (navigation?.emit) {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            } else {
              const modernProps = props as unknown as ModernTabBarProps;
              if (modernProps.navigateToTab) {
                const event = modernProps.emitter?.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event?.defaultPrevented) {
                  modernProps.navigateToTab(route.key);
                }
              } else {
                router.push(`/(tabs)/${route.name}` as Parameters<typeof router.push>[0]);
              }
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
    paddingHorizontal: spacing.md,
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#181A1D',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.float,
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.75)',
    elevation: 20,
    gap: spacing.xs,
    maxWidth: 370,
    width: '100%',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  activeTabInner: {
    backgroundColor: 'rgba(184, 255, 61, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.35)',
  },
  newEntryInner: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    boxShadow: '0px 2px 8px rgba(184, 255, 61, 0.45)',
    elevation: 8,
  },
  newEntryActiveInner: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.06 }],
  },
});
