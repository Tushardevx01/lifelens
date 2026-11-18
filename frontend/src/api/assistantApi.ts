/**
 * LifeLens Conversational Assistant & Voice API Module
 */

import { apiGet, apiPost, apiDelete, apiUpload, fetchWithTimeout, BASE_URL, getAccessToken } from './client';
import type {
  ChatMessage,
  ChatCardPayload,
  ChatSession,
  ChatSessionDetail,
  StarterPrompt,
  VoiceTranscribeResponse,
  VoiceSynthesizeRequest,
  VoiceSynthesizeResponse,
  VoiceChatResponse,
} from '@/src/types/api.types';

export type AudioFileInput =
  | Blob
  | File
  | { uri: string; name: string; type: string };

export const voiceApi = {
  transcribe: async (audioFile: AudioFileInput): Promise<VoiceTranscribeResponse> => {
    const formData = new FormData();
    formData.append('file', audioFile as unknown as Blob);
    return apiUpload<VoiceTranscribeResponse>('/api/assistant/voice/transcribe', formData);
  },

  synthesize: async (data: VoiceSynthesizeRequest): Promise<VoiceSynthesizeResponse> => {
    return apiPost<VoiceSynthesizeResponse>('/api/assistant/voice/synthesize', data);
  },

  chat: async (
    audioFile: AudioFileInput,
    sessionId?: string | null,
    voice = 'alloy',
    speed = 1.0
  ): Promise<VoiceChatResponse> => {
    const formData = new FormData();
    formData.append('file', audioFile as unknown as Blob);
    if (sessionId) formData.append('session_id', sessionId);
    formData.append('voice', voice);
    formData.append('speed', String(speed));
    return apiUpload<VoiceChatResponse>('/api/assistant/voice/chat', formData);
  },
};

export const assistantApi = {
  sendMessage: async (
    message: string,
    sessionId?: string | null
  ): Promise<ChatMessage> => {
    return apiPost('/api/assistant/chat', {
      message,
      session_id: sessionId ?? null,
    });
  },

  streamMessage: async (
    message: string,
    sessionId: string | null,
    onToken: (token: string) => void,
    onCard?: (card: ChatCardPayload) => void,
    onDone?: (info: { session_id?: string; message_id?: string; suggested_actions?: string[] }) => void
  ): Promise<void> => {
    const token = await getAccessToken();
    const query = new URLSearchParams();
    query.set('message', message);
    if (sessionId) query.set('session_id', sessionId);

    const url = `${BASE_URL}/api/assistant/chat/stream?${query.toString()}`;
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(url, { headers }, 30000);
    if (!response.ok) {
      throw new Error(`Streaming failed (${response.status})`);
    }

    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.replace('event: ', '').trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === 'token' && data.token) {
                onToken(data.token);
              } else if (currentEvent === 'card' && data.card && onCard) {
                onCard(data.card);
              } else if (currentEvent === 'done' && onDone) {
                onDone(data);
              }
            } catch {
              // Ignore non-json lines
            }
          }
        }
      }
    } else {
      const fullText = await response.text();
      const lines = fullText.split('\n');
      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.replace('event: ', '').trim();
        } else if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          try {
            const data = JSON.parse(dataStr);
            if (currentEvent === 'token' && data.token) {
              onToken(data.token);
            } else if (currentEvent === 'card' && data.card && onCard) {
              onCard(data.card);
            } else if (currentEvent === 'done' && onDone) {
              onDone(data);
            }
          } catch {
            // Ignore non-json
          }
        }
      }
    }
  },

  listSessions: async (page = 1, pageSize = 20): Promise<ChatSession[]> => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return apiGet(`/api/assistant/sessions?${params}`);
  },

  createSession: async (title?: string): Promise<ChatSession> => {
    return apiPost('/api/assistant/sessions', { title: title ?? 'New Conversation' });
  },

  getSession: async (sessionId: string): Promise<ChatSessionDetail> => {
    return apiGet(`/api/assistant/sessions/${sessionId}`);
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    return apiDelete(`/api/assistant/sessions/${sessionId}`);
  },

  clearHistory: async (): Promise<void> => {
    return apiDelete('/api/assistant/history');
  },

  getStarterPrompts: async (): Promise<StarterPrompt[]> => {
    return apiGet('/api/assistant/prompts');
  },

  getGeminiStatus: async (): Promise<{
    configured: boolean;
    provider: string;
    model: string;
    status: string;
  }> => {
    return apiGet('/api/assistant/gemini/status');
  },

  voice: {
    transcribe: (audioFile: AudioFileInput) => voiceApi.transcribe(audioFile),
    synthesize: (data: VoiceSynthesizeRequest) => voiceApi.synthesize(data),
    chat: (audioFile: AudioFileInput, sessionId?: string | null, voice = 'alloy', speed = 1.0) =>
      voiceApi.chat(audioFile, sessionId, voice, speed),
  },
};
