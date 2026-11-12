import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
import { typography } from '@/src/theme/typography';
import { ChatDataCard } from './ChatDataCard';
import { voiceService } from '@/src/services/voiceService';
import type { ChatMessage } from '@/src/types/api.types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.sender === 'USER';
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Format time string safely
  const timeString = React.useMemo(() => {
    try {
      const d = new Date(message.created_at);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [message.created_at]);

  // Basic formatted markdown paragraph renderer for React Native
  const renderFormattedText = (rawText?: string | null) => {
    if (!rawText || typeof rawText !== 'string') {
      return null;
    }
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      const trimmed = (line || '').trim();
      if (!trimmed) {
        return <View key={idx} style={{ height: 6 }} />;
      }

      if (trimmed === '---') {
        return <View key={idx} style={styles.divider} />;
      }

      // Check if bullet point
      const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ');
      const content = isBullet ? trimmed.slice(2) : trimmed;

      // Parse bold segments **bold**
      const parts = content ? content.split(/(\*\*.*?\*\*|\*.*?\*)/g) : [''];

      return (
        <View key={idx} style={[styles.textLineRow, isBullet && styles.bulletRow]}>
          {isBullet ? <Text style={styles.bulletDot}>•</Text> : null}
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.asstMessageText]}>
            {parts.map((part, pIdx) => {
              if (part && part.startsWith('**') && part.endsWith('**')) {
                return (
                  <Text key={pIdx} style={styles.boldText}>
                    {part.slice(2, -2)}
                  </Text>
                );
              }
              if (part && part.startsWith('*') && part.endsWith('*')) {
                return (
                  <Text key={pIdx} style={styles.italicText}>
                    {part.slice(1, -1)}
                  </Text>
                );
              }
              return part || '';
            })}
          </Text>
        </View>
      );
    });
  };

  const togglePlayAudio = async () => {
    if (isPlayingAudio) {
      await voiceService.stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      if (!message?.content) return;
      setIsPlayingAudio(true);
      try {
        await voiceService.speakText(message.content);
      } finally {
        setIsPlayingAudio(false);
      }
    }
  };

  if (isUser) {
    return (
      <View style={[styles.bubbleWrapper, styles.userBubbleWrapper]}>
        <View style={styles.userBubble}>
          <Text style={styles.userMessageText}>{message?.content || ''}</Text>
          {timeString ? <Text style={styles.userTimeText}>{timeString}</Text> : null}
        </View>
      </View>
    );
  }

  // Assistant Bubble
  return (
    <View style={[styles.bubbleWrapper, styles.asstBubbleWrapper]}>
      <View style={styles.asstHeader}>
        <View style={styles.asstAvatar}>
          <Ionicons name="sparkles" size={13} color={colors.primary} />
        </View>
        <Text style={styles.asstName}>LifeLens AI</Text>
        {timeString ? <Text style={styles.asstTimeText}>{timeString}</Text> : null}
        <TouchableOpacity
          style={styles.speakerBtn}
          onPress={togglePlayAudio}
          accessibilityLabel={isPlayingAudio ? 'Stop reading' : 'Read aloud'}
        >
          <Ionicons
            name={isPlayingAudio ? 'volume-high' : 'volume-medium-outline'}
            size={14}
            color={isPlayingAudio ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.asstBubble}>
        {/* Tool Execution Badges */}
        {Array.isArray(message.tool_calls) && message.tool_calls.length > 0 ? (
          <View style={styles.toolsWrapper}>
            {message.tool_calls.map((tc, idx) => (
              <View key={idx} style={styles.toolBadge}>
                <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                <Text style={styles.toolBadgeText}>
                  Analyzed {tc.tool.replace('get_', '').replace('_', ' ')}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Message Content */}
        <View style={styles.contentWrapper}>
          {renderFormattedText(message?.content || '')}
        </View>

        {/* Interactive Mini-Cards */}
        {Array.isArray(message.cards) && message.cards.length > 0 ? (
          <View style={styles.cardsWrapper}>
            {message.cards.map((card, idx) => (
              <ChatDataCard key={idx} card={card} />
            ))}
          </View>
        ) : null}

        {/* Informational Disclaimer */}
        {message.disclaimer ? (
          <View style={styles.disclaimerWrapper}>
            <Ionicons name="information-circle-outline" size={11} color={colors.textMuted} />
            <Text style={styles.disclaimerText}>{message.disclaimer}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleWrapper: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  userBubbleWrapper: {
    alignItems: 'flex-end',
  },
  asstBubbleWrapper: {
    alignItems: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#1E3B27',
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 61, 0.3)',
    borderRadius: radius.md,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '85%',
  },
  userMessageText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  userTimeText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  asstHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 2,
  },
  asstAvatar: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: 'rgba(184, 255, 61, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  asstName: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  asstTimeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginLeft: spacing.xs,
  },
  speakerBtn: {
    marginLeft: spacing.sm,
    padding: 2,
    borderRadius: radius.full,
  },
  asstBubble: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    borderTopLeftRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '92%',
  },
  toolsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  toolBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  contentWrapper: {
    marginTop: 2,
  },
  textLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1,
  },
  bulletRow: {
    paddingLeft: 4,
  },
  bulletDot: {
    color: colors.primary,
    fontSize: 13,
    marginRight: 6,
    lineHeight: 20,
  },
  messageText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  asstMessageText: {
    color: colors.textPrimary,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  italicText: {
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  cardsWrapper: {
    marginTop: spacing.xs,
  },
  disclaimerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 4,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 9,
    flex: 1,
  },
});
