import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import { assistantApi } from '@/src/services/api';
import { ChatMessageBubble } from './ChatMessageBubble';
import { VoiceModeModal } from './VoiceModeModal';
import type { ChatMessage, ChatSession, StarterPrompt } from '@/src/types/api.types';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

const DEFAULT_STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: 'p-sleep',
    label: 'Why am I tired today?',
    prompt: 'Why am I tired today? Can you analyze my recent sleep duration, bedtime variance, and late-night screen time?',
    category: 'Sleep',
    icon: 'moon-outline',
  },
  {
    id: 'p-money',
    label: 'Where did my money go?',
    prompt: 'Where did most of my money go this month? Show me my discretionary vs non-discretionary spending.',
    category: 'Finance',
    icon: 'wallet-outline',
  },
  {
    id: 'p-exp',
    label: 'How is my experiment going?',
    prompt: 'How is my active behavioral experiment doing? What is my current adherence rate and interim delta?',
    category: 'Experiments',
    icon: 'flask-outline',
  },
  {
    id: 'p-focus',
    label: 'Analyze my deep work',
    prompt: 'What are my peak focus hours and average distraction rate during deep work sessions?',
    category: 'Productivity',
    icon: 'flash-outline',
  },
];

export function ChatModal({ visible, onClose, initialPrompt }: ChatModalProps) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('LifeLens AI');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [starterPrompts, setStarterPrompts] = useState<StarterPrompt[]>(DEFAULT_STARTER_PROMPTS);
  const [isLoading, setIsLoading] = useState(false);
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [showVoiceModeModal, setShowVoiceModeModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadInitialData = React.useCallback(async () => {
    try {
      const [fetchedPrompts, fetchedSessions] = await Promise.all([
        assistantApi.getStarterPrompts().catch(() => DEFAULT_STARTER_PROMPTS),
        assistantApi.listSessions(1, 10).catch(() => []),
      ]);

      if (fetchedPrompts && fetchedPrompts.length > 0) {
        setStarterPrompts(fetchedPrompts);
      }
      setSessions(fetchedSessions);

      // Load most recent session if available and no active session
      if (fetchedSessions.length > 0 && !currentSessionId) {
        loadSession(fetchedSessions[0].id, fetchedSessions[0].title);
      }
    } catch {
      // Graceful fallback
    }
  }, [currentSessionId]);

  // Load sessions and starter prompts on mount
  useEffect(() => {
    if (visible) {
      loadInitialData();
      if (initialPrompt) {
        setInputText(initialPrompt);
      }
    }
  }, [visible, initialPrompt, loadInitialData]);

  const loadSession = async (sessionId: string, title?: string) => {
    try {
      setIsLoading(true);
      const detail = await assistantApi.getSession(sessionId);
      setCurrentSessionId(sessionId);
      setSessionTitle(title || detail.title || 'Conversation');
      setMessages(detail.messages || []);
      setShowSessionsDrawer(false);
    } catch {
      Alert.alert('Error', 'Failed to load conversation history.');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setCurrentSessionId(null);
    setSessionTitle('LifeLens AI');
    setMessages([]);
    setShowSessionsDrawer(false);
  };

  const handleClearAllHistory = () => {
    Alert.alert(
      'Clear All Chat History',
      'Are you sure you want to delete all past conversations with LifeLens AI? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await assistantApi.clearHistory();
              setSessions([]);
              startNewConversation();
            } catch {
              Alert.alert('Error', 'Failed to clear chat history.');
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: currentSessionId || 'pending',
      sender: 'USER',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await assistantApi.sendMessage(text, currentSessionId);
      if (response.session_id) {
        setCurrentSessionId(response.session_id);
      }
      setMessages((prev) => {
        // Replace temp or append
        return [...prev, response];
      });
      // Refresh sessions in background
      assistantApi.listSessions(1, 10).then(setSessions).catch(() => {});
    } catch {
      const failedMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        session_id: currentSessionId || 'offline',
        sender: 'ASSISTANT',
        content:
          "I couldn't reach LifeLens AI, so no analysis was generated. Check your connection and try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, failedMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowSessionsDrawer(!showSessionsDrawer)}
            accessibilityLabel="Switch Conversation"
          >
            <Ionicons name="chatbubbles-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.statusDot} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {sessionTitle}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setShowVoiceModeModal(true)}
              accessibilityLabel="Voice Mode"
            >
              <Ionicons name="mic-outline" size={20} color="#66300C" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerBtn, { marginLeft: spacing.xs }]}
              onPress={startNewConversation}
              accessibilityLabel="New Chat"
            >
              <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerBtn, { marginLeft: spacing.xs }]}
              onPress={onClose}
              accessibilityLabel="Close Assistant"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sessions Switcher Drawer Modal */}
        {showSessionsDrawer ? (
          <View style={styles.drawerOverlay}>
            <View style={styles.drawerCard}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Conversations</Text>
                <TouchableOpacity onPress={() => setShowSessionsDrawer(false)}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.newChatRow} onPress={startNewConversation}>
                <Ionicons name="add-circle" size={18} color="#66300C" />
                <Text style={styles.newChatText}>Start New Conversation</Text>
              </TouchableOpacity>

              <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                style={styles.sessionsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.sessionItem,
                      item.id === currentSessionId && styles.sessionItemActive,
                    ]}
                    onPress={() => loadSession(item.id, item.title)}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={16}
                      color={item.id === currentSessionId ? '#66300C' : colors.textMuted}
                    />
                    <View style={styles.sessionItemContent}>
                      <Text
                        style={[
                          styles.sessionItemTitle,
                          item.id === currentSessionId && styles.sessionItemTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.last_message ? (
                        <Text style={styles.sessionItemSubtitle} numberOfLines={1}>
                          {item.last_message}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptySessionsText}>No previous conversations recorded.</Text>
                }
              />

              {sessions.length > 0 ? (
                <TouchableOpacity
                  style={styles.clearHistoryBtn}
                  onPress={handleClearAllHistory}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.red} />
                  <Text style={styles.clearHistoryText}>Clear Chat History</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Conversation Stream */}
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={({ item }) => <ChatMessageBubble message={item} />}
            contentContainerStyle={[
              styles.messagesContent,
              messages.length === 0 && styles.emptyMessagesContent,
            ]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="sparkles" size={32} color="#66300C" />
                </View>
                <Text style={styles.emptyTitle}>LifeLens Companion</Text>
                <Text style={styles.emptySubtitle}>
                  Ask me anything about your sleep, spending, focus patterns, or behavioral experiments.
                </Text>

                {/* Starter Prompts */}
                <View style={styles.starterPromptsContainer}>
                  <Text style={styles.starterPromptsHeader}>Suggested Prompts</Text>
                  {starterPrompts.map((sp) => (
                    <TouchableOpacity
                      key={sp.id}
                      style={styles.starterPromptPill}
                      onPress={() => handleSendMessage(sp.prompt)}
                    >
                      <Ionicons name={sp.icon as React.ComponentProps<typeof Ionicons>['name']} size={15} color="#66300C" />
                      <Text style={styles.starterPromptText}>{sp.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
          />

          {/* Thinking / Typing Indicator */}
          {isLoading ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#66300C" />
              <Text style={styles.typingText}>LifeLens AI is analyzing your telemetry...</Text>
            </View>
          ) : null}

          {/* Input Bar */}
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
              style={styles.micInputBtn}
              onPress={() => setShowVoiceModeModal(true)}
              accessibilityLabel="Open Hands-Free Voice Companion"
            >
              <Ionicons name="mic-outline" size={21} color="#66300C" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Ask about sleep, spending, habits..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={inputText.trim() && !isLoading ? '#FFFFFF' : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Hands-Free Voice Companion Modal */}
        <VoiceModeModal
          visible={showVoiceModeModal}
          onClose={() => setShowVoiceModeModal(false)}
          sessionId={currentSessionId}
          onSessionUpdated={(sId) => {
            setCurrentSessionId(sId);
            assistantApi
              .getSession(sId)
              .then((d) => {
                setMessages(d.messages || []);
                setSessionTitle(d.title || 'Conversation');
              })
              .catch(() => {});
          }}
          onSwitchToText={(text) => {
            setShowVoiceModeModal(false);
            if (text) {
              setInputText(text);
            }
          }}
        />
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
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.primaryText,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatArea: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: spacing.md,
  },
  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: '#FFEAE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#F8D2BD',
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.primaryText,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.secondaryText,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  starterPromptsContainer: {
    width: '100%',
  },
  starterPromptsHeader: {
    ...typography.caption,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
    fontWeight: '700',
    fontSize: 11,
  },
  starterPromptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  starterPromptText: {
    ...typography.secondary,
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  typingText: {
    ...typography.caption,
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  micInputBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    color: colors.primaryText,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.darkButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceSecondary,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    zIndex: 99,
  },
  drawerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    maxHeight: 380,
    shadowColor: colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  drawerTitle: {
    ...typography.cardTitle,
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  newChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAE0',
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  newChatText: {
    ...typography.secondary,
    color: '#66300C',
    fontWeight: '700',
    fontSize: 13,
  },
  sessionsList: {
    maxHeight: 200,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  sessionItemActive: {
    backgroundColor: '#F5ECE6',
  },
  sessionItemContent: {
    flex: 1,
  },
  sessionItemTitle: {
    ...typography.secondary,
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: '500',
  },
  sessionItemTitleActive: {
    color: '#66300C',
    fontWeight: '700',
  },
  sessionItemSubtitle: {
    ...typography.caption,
    color: colors.secondaryText,
    fontSize: 11,
  },
  emptySessionsText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  clearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  clearHistoryText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 11,
    fontWeight: '600',
  },
});
