import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { IconButton } from '@/src/components/ui';

interface AlertItem {
  id: string;
  type: 'anomaly' | 'streak' | 'insight' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: '1',
    type: 'anomaly',
    title: 'Unusual sleep pattern detected',
    description: 'You slept 2 hours less than your 7-day average. Recovery score impacted by -12pts.',
    time: '2h ago',
    read: false,
  },
  {
    id: '2',
    type: 'streak',
    title: '3-Day Deep Work Streak',
    description: 'Outstanding consistency! You logged 120+ minutes of deep work 3 days in a row.',
    time: '5h ago',
    read: false,
  },
  {
    id: '3',
    type: 'insight',
    title: 'Spending Pattern Insight',
    description: 'Discretionary spending is 28% lower than last Tuesday. On track for monthly savings target.',
    time: 'Yesterday',
    read: true,
  },
  {
    id: '4',
    type: 'system',
    title: 'Apple Health Connector Active',
    description: 'Background sync completed with 0 errors. 14 biometric metrics recorded today.',
    time: 'Yesterday',
    read: true,
  },
];

interface AlertsModalProps {
  visible: boolean;
  onClose: () => void;
  onAlertCountChange?: (unreadCount: number) => void;
}

export default function AlertsModal({
  visible,
  onClose,
  onAlertCountChange,
}: AlertsModalProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);

  const markAllRead = () => {
    const updated = alerts.map((a) => ({ ...a, read: true }));
    setAlerts(updated);
    onAlertCountChange?.(0);
  };

  const dismissAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    setAlerts(updated);
    onAlertCountChange?.(updated.filter((a) => !a.read).length);
  };

  const getIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'anomaly':
        return { name: 'warning-outline' as const, color: '#FF9F4A' };
      case 'streak':
        return { name: 'flame-outline' as const, color: colors.primary };
      case 'insight':
        return { name: 'bulb-outline' as const, color: '#4ADE80' };
      case 'system':
        return { name: 'hardware-chip-outline' as const, color: '#60A5FA' };
    }
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="notifications" size={18} color={colors.primary} />
              </View>
              <Text style={styles.title}>Notifications & Alerts</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <IconButton
              icon="close"
              size={20}
              color={colors.textSecondary}
              onPress={onClose}
              accessibilityLabel="Close notifications modal"
            />
          </View>

          {/* Action Row */}
          {unreadCount > 0 && (
            <View style={styles.actionsBar}>
              <Text style={styles.actionsNote}>You have {unreadCount} unread lifestyle alerts</Text>
              <Pressable
                onPress={markAllRead}
                accessibilityRole="button"
                accessibilityLabel="Mark all alerts as read"
                hitSlop={8}
              >
                <Text style={styles.markReadText}>Mark all as read</Text>
              </Pressable>
            </View>
          )}

          {/* Alert List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {alerts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySubtitle}>No unread anomalies or activity alerts right now.</Text>
              </View>
            ) : (
              alerts.map((item) => {
                const icon = getIcon(item.type);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.alertItem,
                      !item.read && styles.alertItemUnread,
                    ]}
                  >
                    <View style={[styles.typeIconContainer, { borderColor: `${icon.color}40` }]}>
                      <Ionicons name={icon.name} size={18} color={icon.color} />
                    </View>
                    <View style={styles.itemBody}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemTime}>{item.time}</Text>
                      </View>
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    </View>
                    <Pressable
                      style={styles.dismissBtn}
                      onPress={() => dismissAlert(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Dismiss ${item.title}`}
                      hitSlop={6}
                    >
                      <Ionicons name="close" size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: '#181A1D',
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: '#2A2E33',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(184, 255, 61, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.background,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#25282D',
  },
  actionsNote: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1C1F23',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#262A2F',
    padding: spacing.md,
    gap: spacing.sm,
  },
  alertItemUnread: {
    backgroundColor: '#1F2428',
    borderColor: 'rgba(184, 255, 61, 0.25)',
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#141618',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  itemBody: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  itemTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  itemDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  dismissBtn: {
    padding: 4,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
