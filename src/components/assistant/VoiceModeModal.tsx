import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { typography } from '@/src/theme/typography';
import { PulsingVoiceOrb } from './PulsingVoiceOrb';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';
import { ChatDataCard } from './ChatDataCard';
import { voiceService, type VoiceState } from '@/src/services/voiceService';
import { voiceApi } from '@/src/services/api';
import type { ChatCardPayload } from '@/src/types/api.types';

interface VoiceModeModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToText?: (lastQuery?: string) => void;
  sessionId?: string | null;
  onSessionUpdated?: (sessionId: string) => void;
}

export function VoiceModeModal({
  visible,
  onClose,
  onSwitchToText,
  sessionId,
  onSessionUpdated,
}: VoiceModeModalProps) {
  const insets = useSafeAreaInsets();
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcribedQuery, setTranscribedQuery] = useState<string | null>(null);
  const [assistantSpokenReply, setAssistantSpokenReply] = useState<string | null>(null);
  const [cards, setCards] = useState<ChatCardPayload[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null);
  const [statusMessage, setStatusMessage] = useState('Tap the orb to start speaking');
  const [isMuted, setIsMuted] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Sync session ID from props
  useEffect(() => {
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [sessionId]);

  const handleStateChange = useCallback((state: VoiceState) => {
    setVoiceState(state);
    switch (state) {
      case 'RECORDING':
        setStatusMessage('Listening... speak now');
        break;
      case 'PROCESSING':
        setStatusMessage('Analyzing your behavioral telemetry...');
        break;
      case 'SPEAKING':
        setStatusMessage('LifeLens is speaking...');
        break;
      case 'IDLE':
        setStatusMessage('Tap the orb to ask a question');
        break;
      case 'ERROR':
        setStatusMessage('Voice recognition error. Tap to retry.');
        break;
    }
  }, []);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolumeLevel(vol);
  }, []);

  const handleError = useCallback((msg: string) => {
    Alert.alert('Voice Companion', msg);
    setStatusMessage('Tap the orb to try again');
  }, []);

  // Subscribe to voiceService updates
  useEffect(() => {
    voiceService.setListeners({
      onStateChange: handleStateChange,
      onVolumeChange: handleVolumeChange,
      onError: handleError,
    });

    return () => {
      voiceService.setListeners({});
      voiceService.cancelRecording();
      voiceService.stopSpeaking();
      voiceService.stopPlayback();
    };
  }, [handleStateChange, handleVolumeChange, handleError]);

  // Clean up when modal closes
  useEffect(() => {
    if (!visible) {
      voiceService.cancelRecording();
      voiceService.stopSpeaking();
      voiceService.stopPlayback();
      setVoiceState('IDLE');
      setVolumeLevel(0);
    }
  }, [visible]);

  // Handle Orb Press: Toggle Record / Stop
  const handleOrbPress = async () => {
    if (voiceState === 'SPEAKING') {
      // If speaking, interrupt speech immediately
      await voiceService.stopSpeaking();
      await voiceService.stopPlayback();
      return;
    }

    if (voiceState === 'IDLE' || voiceState === 'ERROR') {
      const success = await voiceService.startRecording();
      if (!success) {
        setVoiceState('IDLE');
      }
    } else if (voiceState === 'RECORDING') {
      const result = await voiceService.stopRecording();
      if (!result) {
        setVoiceState('IDLE');
        return;
      }

      // Process voice inquiry
      try {
        setVoiceState('PROCESSING');
        const audioInput = result.blob
          ? result.blob
          : { uri: result.uri, name: result.filename, type: result.mimeType };

        const response = await voiceApi.chat(audioInput, currentSessionId);

        if (response.session_id) {
          setCurrentSessionId(response.session_id);
          onSessionUpdated?.(response.session_id);
        }

        setTranscribedQuery(response.transcribed_query);
        setAssistantSpokenReply(response.spoken_text || response.reply_text);
        setCards(response.cards || []);

        // Speak the response if not muted
        if (!isMuted) {
          if (response.audio_base64) {
            await voiceService.playAudioBase64(
              response.audio_base64,
              response.format === 'mp3' ? 'audio/mpeg' : 'audio/wav'
            );
          } else {
            await voiceService.speakText(response.spoken_text || response.reply_text);
          }
        } else {
          setVoiceState('IDLE');
        }

        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
      } catch {
        setVoiceState('ERROR');
        setStatusMessage('Voice request failed. Check your connection and tap to retry.');
      }
    }
  };

  const handleReplay = async () => {
    if (assistantSpokenReply) {
      await voiceService.speakText(assistantSpokenReply);
    }
  };

  const handleStopSpeaking = async () => {
    await voiceService.stopSpeaking();
    await voiceService.stopPlayback();
  };

  const toggleMute = () => {
    if (!isMuted && voiceState === 'SPEAKING') {
      handleStopSpeaking();
    }
    setIsMuted(!isMuted);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={toggleMute}
            accessibilityLabel={isMuted ? 'Unmute voice' : 'Mute voice'}
          >
            <Ionicons
              name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'}
              size={20}
              color={isMuted ? colors.error : colors.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={[styles.liveDot, voiceState === 'RECORDING' && styles.liveDotActive]} />
            <Text style={styles.headerTitle}>LifeLens Voice</Text>
          </View>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            accessibilityLabel="Close voice mode"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        {/* Central Orb & Waveform Section */}
        <View style={styles.orbSection}>
          <PulsingVoiceOrb
            state={voiceState}
            volume={volumeLevel}
            onPress={handleOrbPress}
            size={135}
          />

          <View style={styles.waveformContainer}>
            <AudioWaveformVisualizer
              volume={volumeLevel}
              active={voiceState === 'RECORDING' || voiceState === 'SPEAKING'}
              barCount={16}
              barColor={voiceState === 'RECORDING' ? colors.error : colors.primary}
            />
          </View>
        </View>

        {/* Transcript & Response Area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.transcriptScroll}
          contentContainerStyle={[
            styles.transcriptContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 70 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {transcribedQuery ? (
            <View style={styles.userTranscriptBubble}>
              <View style={styles.bubbleHeader}>
                <Ionicons name="mic" size={14} color={colors.primary} />
                <Text style={styles.bubbleRoleLabel}>You asked</Text>
              </View>
              <Text style={styles.userTranscriptText}>{transcribedQuery}</Text>
            </View>
          ) : null}

          {voiceState === 'PROCESSING' ? (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Retrieving telemetry from database...</Text>
            </View>
          ) : null}

          {assistantSpokenReply ? (
            <View style={styles.assistantReplyBubble}>
              <View style={styles.bubbleHeader}>
                <Ionicons name="sparkles" size={14} color={colors.purple} />
                <Text style={styles.bubbleRoleLabel}>LifeLens AI</Text>
              </View>
              <Text style={styles.assistantReplyText}>{assistantSpokenReply}</Text>

              {/* Render structured telemetry cards if returned */}
              {cards && cards.length > 0 ? (
                <View style={styles.cardsWrap}>
                  {cards.map((card, idx) => (
                    <ChatDataCard key={idx} card={card} />
                  ))}
                </View>
              ) : null}

              <Text style={styles.disclaimerText}>
                LifeLens provides behavioral data analytics for self-reflection, not medical or
                financial advice.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom Control Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {assistantSpokenReply ? (
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleReplay}
              disabled={voiceState === 'RECORDING'}
            >
              <Ionicons name="reload" size={18} color={colors.textPrimary} />
              <Text style={styles.controlBtnText}>Replay</Text>
            </TouchableOpacity>
          ) : null}

          {voiceState === 'SPEAKING' ? (
            <TouchableOpacity style={styles.stopSpeechBtn} onPress={handleStopSpeaking}>
              <Ionicons name="pause" size={18} color="#FFFFFF" />
              <Text style={styles.stopSpeechBtnText}>Stop Audio</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => {
              onClose();
              onSwitchToText?.(transcribedQuery || undefined);
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
            <Text style={[styles.controlBtnText, { color: colors.primary }]}>Switch to Text</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surfaceSoft,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  liveDotActive: {
    backgroundColor: colors.error,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
  },
  statusBanner: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  statusText: {
    ...typography.secondary,
    color: colors.textSecondary,
    fontSize: 13,
  },
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  waveformContainer: {
    marginTop: spacing.xs,
  },
  transcriptScroll: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  transcriptContent: {
    gap: spacing.sm,
  },
  userTranscriptBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignSelf: 'flex-end',
    maxWidth: '90%',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  bubbleRoleLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  userTranscriptText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignSelf: 'flex-start',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  assistantReplyBubble: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignSelf: 'flex-start',
    width: '100%',
  },
  assistantReplyText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  cardsWrap: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSoft,
  },
  controlBtnText: {
    ...typography.button,
    fontSize: 13,
    color: colors.textPrimary,
  },
  stopSpeechBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.error,
  },
  stopSpeechBtnText: {
    ...typography.button,
    fontSize: 13,
    color: '#FFFFFF',
  },
});

