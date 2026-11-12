import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/radius';
import type { DataConnector } from '@/src/types/api.types';

interface ConnectorCardProps {
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  badgeText?: string;
  connector?: DataConnector;
  isEnabled: boolean;
  onToggle: (val: boolean) => void;
  onPressSync?: () => void;
  isSyncing?: boolean;
}

export const ConnectorCard: React.FC<ConnectorCardProps> = ({
  title,
  subtitle,
  iconName,
  iconColor,
  badgeText,
  connector,
  isEnabled,
  onToggle,
  onPressSync,
  isSyncing,
}) => {
  const isConnected = isEnabled && connector?.status !== 'DISCONNECTED';
  const statusColor = isConnected ? colors.primary : colors.textMuted;
  const statusLabel = isConnected ? 'Active' : 'Disabled';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrapper, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {badgeText ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeText}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={onToggle}
          trackColor={{ false: '#26292B', true: `${colors.primary}60` }}
          thumbColor={isEnabled ? colors.primary : '#606466'}
        />
      </View>

      <View style={styles.footerRow}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          {connector?.total_records_synced ? (
            <Text style={styles.recordsText}>
              • {connector.total_records_synced.toLocaleString()} records synced
            </Text>
          ) : null}
        </View>

        {onPressSync && isEnabled ? (
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={onPressSync}
            disabled={isSyncing}
          >
            <Ionicons
              name={isSyncing ? 'sync' : 'refresh-outline'}
              size={14}
              color={colors.primary}
            />
            <Text style={styles.syncBtnText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#17191A',
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#26292B',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    backgroundColor: '#1E252B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#344047',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A9EFF',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#202324',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordsText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B2418',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    gap: 4,
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
