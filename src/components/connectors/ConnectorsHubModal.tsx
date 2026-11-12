import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/radius';
import { IconButton } from '@/src/components/ui';
import { ConnectorCard } from '@/src/components/connectors/ConnectorCard';
import {
  getConnectorsList,
  toggleConnector,
  syncAllConnectors,
  getLastSyncTimestamp,
  SyncAllSummary,
} from '@/src/services/connectorManager';
import { syncHealthMetrics } from '@/src/services/healthSyncService';
import { syncDeviceUsage } from '@/src/services/deviceUsageService';
import { uploadAndIngestStatement } from '@/src/services/statementParserService';
import type { DataConnector, DataConnectorType } from '@/src/types/api.types';

interface ConnectorsHubModalProps {
  visible: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const ConnectorsHubModal: React.FC<ConnectorsHubModalProps> = ({
  visible,
  onClose,
  onSyncComplete,
}) => {
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [statementModalVisible, setStatementModalVisible] = useState(false);
  const [statementCsv, setStatementCsv] = useState('');
  const [importingStatement, setImportingStatement] = useState(false);
  const [recentLogs, setRecentLogs] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadConnectors();
    }
  }, [visible]);

  const loadConnectors = async () => {
    setLoading(true);
    try {
      const list = await getConnectorsList();
      setConnectors(list);
      const ts = await getLastSyncTimestamp();
      if (ts) setLastSyncTime(ts);
    } catch {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (type: string, isEnabled: boolean) => {
    try {
      const updated = await toggleConnector(type as DataConnectorType, isEnabled);
      setConnectors((prev) =>
        prev.map((c) => (c.connector_type === type ? updated : c))
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update connector status';
      Alert.alert('Error', msg);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const summary: SyncAllSummary = await syncAllConnectors();
      setLastSyncTime(summary.syncedAt);
      if (summary.totalIngested > 0) {
        setRecentLogs((prev) => [
          `Synced ${summary.totalIngested} new data points across all sources • Just now`,
          ...prev.slice(0, 4),
        ]);
      }
      await loadConnectors();
      if (onSyncComplete) onSyncComplete();
      if (summary.errors.length > 0) {
        Alert.alert(
          'Sync Incomplete',
          `${summary.totalIngested} records synced. ${summary.errors.join('\n')}`
        );
        return;
      }
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${summary.totalIngested} records. (${summary.totalDeduplicated} duplicates ignored).`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Synchronization failed.';
      Alert.alert('Sync Notice', msg);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncHealth = async () => {
    setSyncingKey('health');
    try {
      const res = await syncHealthMetrics();
      setRecentLogs((prev) => [
        `Imported sleep & activity from HealthKit • Just now`,
        ...prev.slice(0, 4),
      ]);
      await loadConnectors();
      if (onSyncComplete) onSyncComplete();
      Alert.alert('Health Sync', `Imported health metrics for ${res.details?.date || 'today'}.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Health sync failed';
      Alert.alert('Error', msg);
    } finally {
      setSyncingKey(null);
    }
  };

  const handleSyncUsage = async () => {
    setSyncingKey('usage');
    try {
      const res = await syncDeviceUsage();
      setRecentLogs((prev) => [
        `Imported ${res.records_ingested} app usage sessions • Just now`,
        ...prev.slice(0, 4),
      ]);
      await loadConnectors();
      if (onSyncComplete) onSyncComplete();
      Alert.alert('Device Usage Sync', `Imported ${res.records_ingested} app foreground sessions.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Usage sync failed';
      Alert.alert('Error', msg);
    } finally {
      setSyncingKey(null);
    }
  };

  const handleImportStatement = async () => {
    if (!statementCsv.trim()) {
      Alert.alert('Empty Statement', 'Please paste CSV bank statement data.');
      return;
    }
    setImportingStatement(true);
    try {
      const res = await uploadAndIngestStatement(statementCsv);
      setRecentLogs((prev) => [
        `Imported ${res.records_ingested} transactions from CSV statement • Just now`,
        ...prev.slice(0, 4),
      ]);
      setStatementCsv('');
      setStatementModalVisible(false);
      await loadConnectors();
      if (onSyncComplete) onSyncComplete();
      Alert.alert(
        'Statement Ingested',
        `Successfully imported ${res.records_ingested} transactions (${res.records_deduplicated} duplicates skipped).`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to parse CSV statement.';
      Alert.alert('Import Failed', msg);
    } finally {
      setImportingStatement(false);
    }
  };

  const loadSampleStatement = () => {
    const sample = `Date,Narration,Withdrawal Amount,Deposit Amount,Closing Balance
04/11/2026,UPI-SWIGGY-REST-12938,450.00,,14500.00
05/11/2026,UBER TRIP BANGALORE,280.00,,14220.00
06/11/2026,AMAZON INDIA RETAIL,1299.00,,12921.00
07/11/2026,NETFLIX.COM SUBSCRIPTION,649.00,,12272.00
07/11/2026,SHELL PETROL PUMP,400.00,,11872.00`;
    setStatementCsv(sample);
  };

  const getConnector = (type: string) => connectors.find((c) => c.connector_type === type);
  const isEnabled = (type: string) => getConnector(type)?.is_enabled ?? true;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Data Sources</Text>
            <Text style={styles.headerSubtitle}>Automated Device Connectors (Phase 5)</Text>
          </View>
          <IconButton
            icon="close"
            size={22}
            onPress={onClose}
            accessibilityLabel="Close connectors hub"
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Master Sync Banner */}
          <View style={styles.syncBanner}>
            <View style={styles.syncBannerLeft}>
              <Text style={styles.syncBannerTitle}>Unified Data Ingestion</Text>
              <Text style={styles.syncBannerSubtitle}>
                {lastSyncTime
                  ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Automated 06:00 AM daily sync active'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.syncAllBtn}
              onPress={handleSyncAll}
              disabled={syncingAll}
            >
              {syncingAll ? (
                <ActivityIndicator size="small" color="#0E1011" />
              ) : (
                <>
                  <Ionicons name="cloud-download" size={16} color="#0E1011" />
                  <Text style={styles.syncAllBtnText}>Sync All</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Privacy Guarantee Pill */}
          <View style={styles.privacyCard}>
            <Ionicons name="shield-checkmark" size={20} color="#00D4AA" />
            <Text style={styles.privacyText}>
              <Text style={styles.privacyBold}>100% On-Device Privacy: </Text>
              Zero raw SMS texts, passwords, or personal messages ever leave your phone. Only sanitized amounts & merchant tags are ingested.
            </Text>
          </View>

          {/* Standalone Autonomy Pill */}
          <View style={[styles.privacyCard, { backgroundColor: 'rgba(93, 169, 255, 0.08)', borderColor: 'rgba(93, 169, 255, 0.25)' }]}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
            <Text style={styles.privacyText}>
              <Text style={[styles.privacyBold, { color: colors.primary }]}>Zero 3rd-Party Requirement: </Text>
              LifeLens features native on-device trackers for Sleep Stages, Circadian Drift, Workouts, Screen Unlocks, Deep Work, and Expenses — fully functional without Google Fit or Apple Health.
            </Text>
          </View>

          {/* Connectors Section */}
          <Text style={styles.sectionHeader}>CONNECTED SENSORS & LOGGERS</Text>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <>
              {/* 1. HealthKit / Health Connect */}
              <ConnectorCard
                title="Apple Health / Health Connect"
                subtitle="Sleep stages (Core, Deep, REM), steps, active minutes & resting heart rate"
                iconName="heart"
                iconColor="#FF4757"
                badgeText="iOS / Android"
                connector={getConnector('APPLE_HEALTH')}
                isEnabled={isEnabled('APPLE_HEALTH')}
                onToggle={(val) => handleToggle('APPLE_HEALTH', val)}
                onPressSync={handleSyncHealth}
                isSyncing={syncingKey === 'health'}
              />

              {/* 2. Device Usage & Screen Time */}
              <ConnectorCard
                title="Screen Time & App Usage"
                subtitle="Foreground app sessions, unlock count, and late-night circadian tracking"
                iconName="phone-portrait"
                iconColor="#4A9EFF"
                badgeText="UsageStats"
                connector={getConnector('DEVICE_USAGE')}
                isEnabled={isEnabled('DEVICE_USAGE')}
                onToggle={(val) => handleToggle('DEVICE_USAGE', val)}
                onPressSync={handleSyncUsage}
                isSyncing={syncingKey === 'usage'}
              />

              {/* 3. On-Device SMS Transaction Parser */}
              <ConnectorCard
                title="On-Device SMS Financial Parser"
                subtitle="Instant UPI & bank debit alerts (HDFC, SBI, ICICI, Google Pay, PhonePe, Paytm)"
                iconName="chatbubble-ellipses"
                iconColor="#B8FF00"
                badgeText="On-Device"
                connector={getConnector('SMS_PARSER')}
                isEnabled={isEnabled('SMS_PARSER')}
                onToggle={(val) => handleToggle('SMS_PARSER', val)}
              />

              {/* 4. Bank Statement & Institutional Sync */}
              <ConnectorCard
                title="Bank Statements & Direct Feeds"
                subtitle="Plaid & Finvu Account Aggregator webhook or direct CSV statement import"
                iconName="receipt"
                iconColor="#FFA502"
                badgeText="CSV / Webhook"
                connector={getConnector('CSV_STATEMENT')}
                isEnabled={isEnabled('CSV_STATEMENT')}
                onToggle={(val) => handleToggle('CSV_STATEMENT', val)}
                onPressSync={() => setStatementModalVisible(true)}
              />
            </>
          )}

          {/* Quick Statement Upload CTA */}
          <TouchableOpacity
            style={styles.uploadStatementCta}
            onPress={() => setStatementModalVisible(true)}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.uploadStatementText}>Import Bank Statement (CSV / JSON)</Text>
          </TouchableOpacity>

          {/* Recent Sync Audit Log */}
          <Text style={[styles.sectionHeader, { marginTop: 24 }]}>RECENT SYNC ACTIVITY</Text>
          <View style={styles.auditLogCard}>
            {recentLogs.length === 0 ? (
              <View style={styles.logRow}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <Text style={styles.logText}>No sync activity yet.</Text>
              </View>
            ) : (
              recentLogs.map((log, index) => (
                <View
                  key={index}
                  style={[
                    styles.logRow,
                    index === recentLogs.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#00D4AA" style={{ marginTop: 2 }} />
                  <Text style={styles.logText}>{log}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* CSV Statement Import Sub-Modal */}
        <Modal
          visible={statementModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setStatementModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.statementModalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Import Bank Statement</Text>
                <IconButton
                  icon="close"
                  size={18}
                  onPress={() => setStatementModalVisible(false)}
                  accessibilityLabel="Close statement import modal"
                />
              </View>
              <Text style={styles.modalSubtitle}>
                Paste bank CSV statement rows (supports HDFC, SBI, ICICI, Chase, and generic formats):
              </Text>

              <TextInput
                style={styles.csvInput}
                multiline
                placeholder="Date,Narration,Withdrawal Amount,Deposit Amount..."
                placeholderTextColor={colors.textMuted}
                value={statementCsv}
                onChangeText={setStatementCsv}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.sampleBtn} onPress={loadSampleStatement}>
                  <Text style={styles.sampleBtnText}>Paste Sample</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.importBtn}
                  onPress={handleImportStatement}
                  disabled={importingStatement}
                >
                  {importingStatement ? (
                    <ActivityIndicator size="small" color="#0E1011" />
                  ) : (
                    <Text style={styles.importBtnText}>Parse & Ingest</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1011',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1D1E',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  syncBanner: {
    backgroundColor: '#17191A',
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#26292B',
  },
  syncBannerLeft: {
    flex: 1,
    marginRight: 12,
  },
  syncBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  syncBannerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  syncAllBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncAllBtnText: {
    color: '#0E1011',
    fontWeight: '700',
    fontSize: 13,
  },
  privacyCard: {
    backgroundColor: '#11221D',
    borderRadius: radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#194D3B',
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#9FEAD2',
    lineHeight: 18,
  },
  privacyBold: {
    fontWeight: '700',
    color: '#00D4AA',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  uploadStatementCta: {
    backgroundColor: '#17191A',
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  uploadStatementText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  auditLogCard: {
    backgroundColor: '#17191A',
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26292B',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#202324',
  },
  logText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  statementModalCard: {
    backgroundColor: '#17191A',
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2D3235',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: 14,
  },
  csvInput: {
    backgroundColor: '#0E1011',
    borderWidth: 1,
    borderColor: '#2D3235',
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 12,
    height: 140,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sampleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sampleBtnText: {
    fontSize: 13,
    color: '#4A9EFF',
    fontWeight: '600',
  },
  importBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  importBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E1011',
  },
});
