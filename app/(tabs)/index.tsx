import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { mockDashboardData } from '@/src/features/dashboard';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const data = mockDashboardData;
  const scoreParts = data.lifeScore.overall.toString().split('.');

  // Fade animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* 
        We don't use a standard ScrollView wrapper for the whole screen 
        because we want the dark background to stay fixed and the white sheet 
        to scroll up over it, OR the whole thing can scroll but the background 
        stays dark. We'll make the whole thing scrollable but with a dark background,
        and the white sheet flexes to fill the rest. 
      */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: 120, minHeight: '100%' }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Top Dark Section */}
          <View style={[styles.topSection, { paddingTop: insets.top + 10 }]}>
            
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar} />
                <View style={styles.avatarBadge} />
              </View>
              <Ionicons name="notifications" size={24} color={colors.textSecondary} />
            </View>

            {/* Hero Metric */}
            <View style={styles.heroContainer}>
              <Text style={styles.heroLabel}>Life Score</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreBig}>{scoreParts[0]}</Text>
                {scoreParts[1] && <Text style={styles.scoreSmall}>.{scoreParts[1]}</Text>}
              </View>

              {/* Action Pills */}
              <View style={styles.actionRow}>
                <Pressable style={styles.actionPillPrimary}>
                  <View style={styles.actionIconCircle}>
                    <Ionicons name="arrow-back" size={14} color={colors.surfaceLight} />
                  </View>
                  <Text style={styles.actionPillPrimaryText}>Improve</Text>
                </Pressable>
                
                <Pressable style={styles.actionPillSecondary}>
                  <Text style={styles.actionPillSecondaryText}>Details</Text>
                </Pressable>
              </View>
            </View>

            {/* Floating Metric Card (Productivity) */}
            <View style={styles.floatingCard}>
              <View>
                <Text style={styles.floatingCardLabel}>Productivity</Text>
                <Text style={styles.floatingCardValue}>{data.lifeScore.productivity}</Text>
              </View>
              
              {/* Overlapping icons mimic */}
              <View style={styles.overlappingIconsRow}>
                <View style={[styles.overlapIcon, { zIndex: 3, backgroundColor: '#333' }]}>
                  <Ionicons name="briefcase" size={16} color={colors.white} />
                </View>
                <View style={[styles.overlapIcon, { zIndex: 2, backgroundColor: colors.orange, marginLeft: -12 }]}>
                  <Ionicons name="flame" size={16} color={colors.white} />
                </View>
                <View style={[styles.overlapIcon, { zIndex: 1, backgroundColor: '#555', marginLeft: -12 }]}>
                  <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>+2</Text>
                </View>
              </View>
            </View>

            {/* Decorative Edge Card (multicolored) */}
            <View style={styles.decorativeEdge}>
              <View style={[styles.decoStripe, { backgroundColor: colors.yellow }]} />
              <View style={[styles.decoStripe, { backgroundColor: colors.primary }]} />
              <View style={[styles.decoStripe, { backgroundColor: colors.blue }]} />
            </View>
            
          </View>

          {/* Bottom White Sheet */}
          <View style={styles.bottomSheet}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.iconButton}>
                <Ionicons name="menu-outline" size={20} color={colors.textDarkSecondary} />
              </View>
              <Text style={styles.sheetTitle}>Recent Insights</Text>
              <View style={styles.iconButton}>
                <Ionicons name="search-outline" size={20} color={colors.textDarkSecondary} />
              </View>
            </View>

            {/* List Items */}
            <View style={styles.listContainer}>
              {data.correlations.map((item, index) => (
                <View key={item.id} style={styles.listItem}>
                  <View style={styles.listIconContainer}>
                    <Ionicons 
                      name={index % 2 === 0 ? 'moon' : 'fitness'} 
                      size={24} 
                      color={colors.textDark} 
                    />
                    <View style={[styles.listIconBadge, { backgroundColor: item.positive ? colors.green : colors.yellow }]} />
                  </View>
                  
                  <View style={styles.listTextContainer}>
                    <Text style={styles.listTitle} numberOfLines={1}>{item.title.split('→')[0].trim()}</Text>
                  </View>

                  <Text style={[styles.listValue, { color: item.positive ? colors.green : colors.textDark }]}>
                    {item.positive ? '+' : ''}{item.score}
                  </Text>
                </View>
              ))}
              {data.insights.map((item, index) => (
                <View key={item.id} style={styles.listItem}>
                  <View style={styles.listIconContainer}>
                    <Ionicons name={item.icon as any} size={24} color={colors.textDark} />
                    <View style={[styles.listIconBadge, { backgroundColor: colors.cyan }]} />
                  </View>
                  
                  <View style={styles.listTextContainer}>
                    <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
                  </View>

                  <Text style={[styles.listValue, { color: colors.textDarkSecondary }]}>
                    View
                  </Text>
                </View>
              ))}
            </View>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    // Avatar styling placeholder
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  heroContainer: {
    marginBottom: 40,
  },
  heroLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  scoreBig: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -2,
  },
  scoreSmall: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionPillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    gap: 8,
  },
  actionIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
  },
  actionPillSecondary: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    justifyContent: 'center',
  },
  actionPillSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  floatingCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10,
  },
  floatingCardLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  floatingCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overlappingIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlapIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  decorativeEdge: {
    position: 'absolute',
    right: -20,
    top: 140,
    flexDirection: 'row',
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    opacity: 0.9,
  },
  decoStripe: {
    width: 16,
    height: '100%',
  },
  bottomSheet: {
    backgroundColor: colors.surfaceLight,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 32,
    paddingHorizontal: 24,
    minHeight: Dimensions.get('window').height * 0.6,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLightSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  listContainer: {
    gap: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listIconContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLightSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surfaceLight,
  },
  listTextContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  listValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
