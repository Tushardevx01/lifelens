/**
 * LifeLens Cross-Platform Voice Service (Phase 4).
 *
 * Supports:
 * - High-quality audio recording with live metering volume levels (expo-av on native, MediaRecorder/WebAudio on web)
 * - Natural text-to-speech reading with pause/stop/replay controls (expo-speech on native, SpeechSynthesis on web)
 * - Remote audio playback for backend synthesized speech
 * - Permission management and edge-case guards (rapid taps, short recordings, empty audio)
 */

import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export type VoiceState = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'SPEAKING' | 'ERROR';

export interface RecordedAudioResult {
  uri: string;
  blob?: Blob;
  durationMs: number;
  filename: string;
  mimeType: string;
}

export interface VoiceServiceListeners {
  onStateChange?: (state: VoiceState) => void;
  onVolumeChange?: (normalizedVolume: number) => void; // 0.0 to 1.0
  onError?: (errorMessage: string) => void;
}

class VoiceService {
  private currentState: VoiceState = 'IDLE';
  private recording: Audio.Recording | null = null;
  private playbackSound: Audio.Sound | null = null;
  private recordStartTime = 0;
  private listeners: VoiceServiceListeners = {};
  private volumeInterval: ReturnType<typeof setInterval> | null = null;

  // Web-specific properties
  private webMediaRecorder: MediaRecorder | null = null;
  private webAudioChunks: Blob[] = [];
  private webAudioContext: AudioContext | null = null;
  private webAnalyser: AnalyserNode | null = null;
  private webMediaStream: MediaStream | null = null;

  public setListeners(listeners: VoiceServiceListeners) {
    this.listeners = listeners;
  }

  public getState(): VoiceState {
    return this.currentState;
  }

  private setState(state: VoiceState) {
    this.currentState = state;
    this.listeners.onStateChange?.(state);
  }

  // ==========================================================================
  // Permissions
  // ==========================================================================

  public async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
          return true;
        }
        return true;
      }

      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Audio Recording (STT Input)
  // ==========================================================================

  public async startRecording(): Promise<boolean> {
    if (this.currentState === 'RECORDING') {
      return false;
    }

    // Stop any ongoing playback
    await this.stopPlayback();
    await this.stopSpeaking();

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.listeners.onError?.('Microphone permission was denied. Please enable microphone access in settings.');
      this.setState('ERROR');
      return false;
    }

    try {
      this.recordStartTime = Date.now();

      if (Platform.OS === 'web') {
        return await this.startWebRecording();
      } else {
        return await this.startNativeRecording();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      this.listeners.onError?.(msg);
      this.setState('ERROR');
      return false;
    }
  }

  private async startNativeRecording(): Promise<boolean> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
    });

    recording.setOnRecordingStatusUpdate((status) => {
      if (status.isRecording && status.metering !== undefined) {
        // Metering is in dB from -160 to 0
        const db = status.metering;
        const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
        this.listeners.onVolumeChange?.(normalized);
      }
    });

    await recording.startAsync();
    this.recording = recording;
    this.setState('RECORDING');
    return true;
  }

  private async startWebRecording(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.listeners.onError?.('Audio recording is not supported in this browser.');
      this.setState('ERROR');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.webMediaStream = stream;
      this.webAudioChunks = [];

      // Set up Web Audio Analyser for volume metering
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.webAudioContext = new AudioCtx();
        const source = this.webAudioContext.createMediaStreamSource(stream);
        this.webAnalyser = this.webAudioContext.createAnalyser();
        this.webAnalyser.fftSize = 256;
        source.connect(this.webAnalyser);

        const dataArray = new Uint8Array(this.webAnalyser.frequencyBinCount);
        this.volumeInterval = setInterval(() => {
          if (this.webAnalyser && this.currentState === 'RECORDING') {
            this.webAnalyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(1, avg / 128);
            this.listeners.onVolumeChange?.(normalized);
          }
        }, 100);
      }

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.webAudioChunks.push(e.data);
        }
      };

      recorder.start(100);
      this.webMediaRecorder = recorder;
      this.setState('RECORDING');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access failed';
      this.listeners.onError?.(`Could not start audio recording: ${msg}`);
      this.setState('ERROR');
      return false;
    }
  }

  public async stopRecording(): Promise<RecordedAudioResult | null> {
    if (this.currentState !== 'RECORDING') {
      return null;
    }

    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }

    const durationMs = Date.now() - this.recordStartTime;
    if (durationMs < 400) {
      this.listeners.onError?.('Recording was too short. Please press, speak, and tap stop.');
      await this.cancelRecording();
      return null;
    }

    try {
      this.setState('PROCESSING');

      if (Platform.OS === 'web') {
        return await this.stopWebRecording(durationMs);
      } else {
        return await this.stopNativeRecording(durationMs);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to finalize audio recording';
      this.listeners.onError?.(msg);
      this.setState('IDLE');
      return null;
    }
  }

  private async stopNativeRecording(durationMs: number): Promise<RecordedAudioResult | null> {
    if (!this.recording) {
      this.setState('IDLE');
      return null;
    }

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    if (!uri) {
      this.setState('IDLE');
      return null;
    }

    return {
      uri,
      durationMs,
      filename: `voice_${Date.now()}.m4a`,
      mimeType: 'audio/m4a',
    };
  }

  private async stopWebRecording(durationMs: number): Promise<RecordedAudioResult | null> {
    if (this.webMediaRecorder && this.webMediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!this.webMediaRecorder || this.webMediaRecorder.state === 'inactive') {
          return resolve();
        }
        this.webMediaRecorder.addEventListener('stop', () => resolve(), { once: true });
        this.webMediaRecorder.stop();
        setTimeout(resolve, 300);
      });
    }

    if (this.webMediaStream) {
      this.webMediaStream.getTracks().forEach((track) => track.stop());
      this.webMediaStream = null;
    }

    if (this.webAudioContext) {
      await this.webAudioContext.close().catch(() => {});
      this.webAudioContext = null;
    }

    if (this.webAudioChunks.length === 0) {
      this.listeners.onError?.('No audio was captured. Check microphone permissions and try again.');
      this.setState('IDLE');
      return null;
    }

    const blob = new Blob(this.webAudioChunks, { type: 'audio/webm' });
    const uri = typeof URL !== 'undefined' ? URL.createObjectURL(blob) : 'blob:voice-record';

    return {
      uri,
      blob,
      durationMs,
      filename: `voice_${Date.now()}.webm`,
      mimeType: 'audio/webm',
    };
  }

  public async cancelRecording(): Promise<void> {
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // ignore cleanup error
      }
      this.recording = null;
    }

    if (this.webMediaStream) {
      this.webMediaStream.getTracks().forEach((track) => track.stop());
      this.webMediaStream = null;
    }

    this.setState('IDLE');
    this.listeners.onVolumeChange?.(0);
  }

  // ==========================================================================
  // Text-To-Speech (TTS Output)
  // ==========================================================================

  public async speakText(text: string, rate = 1.0): Promise<void> {
    await this.stopSpeaking();
    await this.stopPlayback();

    const clean = text
      .replace(/[*#`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!clean) return;

    this.setState('SPEAKING');

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = rate;
      utterance.onend = () => {
        this.setState('IDLE');
        this.listeners.onVolumeChange?.(0);
      };
      utterance.onerror = () => {
        this.setState('IDLE');
        this.listeners.onVolumeChange?.(0);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      Speech.speak(clean, {
        rate,
        language: 'en-US',
        onDone: () => {
          this.setState('IDLE');
          this.listeners.onVolumeChange?.(0);
        },
        onStopped: () => {
          this.setState('IDLE');
          this.listeners.onVolumeChange?.(0);
        },
        onError: () => {
          this.setState('IDLE');
          this.listeners.onVolumeChange?.(0);
        },
      });
    }
  }

  public async stopSpeaking(): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    } else {
      await Speech.stop();
    }
    if (this.currentState === 'SPEAKING') {
      this.setState('IDLE');
    }
    this.listeners.onVolumeChange?.(0);
  }

  // ==========================================================================
  // Remote Synthesized Audio Playback
  // ==========================================================================

  public async playAudioBase64(base64Data: string, mimeType = 'audio/wav'): Promise<void> {
    await this.stopPlayback();
    await this.stopSpeaking();

    this.setState('SPEAKING');

    try {
      const soundUri = `data:${mimeType};base64,${base64Data}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { shouldPlay: true }
      );
      this.playbackSound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.stopPlayback();
        }
      });
    } catch {
      // Fallback: stop audio state
      this.setState('IDLE');
    }
  }

  public async stopPlayback(): Promise<void> {
    if (this.playbackSound) {
      try {
        await this.playbackSound.stopAsync();
        await this.playbackSound.unloadAsync();
      } catch {
        // ignore
      }
      this.playbackSound = null;
    }
    if (this.currentState === 'SPEAKING') {
      this.setState('IDLE');
    }
  }
}

export const voiceService = new VoiceService();

