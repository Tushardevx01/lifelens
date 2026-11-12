import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import type { VoiceState } from '@/src/services/voiceService';

interface PulsingVoiceOrbProps {
  state: VoiceState;
  volume: number; // 0.0 to 1.0
  onPress: () => void;
  size?: number;
}

export function PulsingVoiceOrb({
  state,
  volume,
  onPress,
  size = 140,
}: PulsingVoiceOrbProps) {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Idle / speaking gentle breathing loop
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (state === 'IDLE' || state === 'SPEAKING') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: state === 'SPEAKING' ? 1.15 : 1.06,
            duration: state === 'SPEAKING' ? 600 : 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: state === 'SPEAKING' ? 600 : 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else if (state === 'RECORDING') {
      // Scale directly with mic volume
      Animated.spring(pulseAnim, {
        toValue: 1 + volume * 0.35,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else if (state === 'PROCESSING') {
      // Fast rotation
      loop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
    }

    return () => {
      if (loop) loop.stop();
    };
  }, [state, volume, pulseAnim, rotateAnim]);

  // Expanding ripple effect when recording or speaking
  useEffect(() => {
    if (state === 'RECORDING' || state === 'SPEAKING') {
      const ripple = Animated.loop(
        Animated.sequence([
          Animated.timing(rippleAnim, {
            toValue: 1.45,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      ripple.start();
      return () => ripple.stop();
    } else {
      rippleAnim.setValue(1);
    }
  }, [state, rippleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Dynamic colors based on state
  const getOrbColor = () => {
    switch (state) {
      case 'RECORDING':
        return colors.error; // Red / Active recording
      case 'PROCESSING':
        return colors.purple; // Thinking / Telemetry retrieval
      case 'SPEAKING':
        return colors.primary; // LifeLens lime / Speaking
      case 'ERROR':
        return colors.error;
      case 'IDLE':
      default:
        return colors.primary;
    }
  };

  const orbColor = getOrbColor();

  return (
    <View style={[styles.container, { width: size * 1.5, height: size * 1.5 }]}>
      {/* Outer Ripple Wave */}
      {(state === 'RECORDING' || state === 'SPEAKING') && (
        <Animated.View
          style={[
            styles.ripple,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: orbColor,
              transform: [{ scale: rippleAnim }],
              opacity: rippleAnim.interpolate({
                inputRange: [1, 1.45],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
      )}

      {/* Main Interactive Pulsing Core */}
      <Animated.View
        style={[
          styles.orbGlow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: `${orbColor}20`,
            borderColor: `${orbColor}50`,
            transform: [
              { scale: pulseAnim },
              { rotate: state === 'PROCESSING' ? spin : '0deg' },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={[
            styles.orbCore,
            {
              width: size * 0.72,
              height: size * 0.72,
              borderRadius: (size * 0.72) / 2,
              backgroundColor: orbColor,
            },
          ]}
          accessibilityLabel={
            state === 'RECORDING' ? 'Stop recording voice' : 'Start speaking to LifeLens AI'
          }
        >
          {state === 'RECORDING' ? (
            <Ionicons name="stop" size={size * 0.28} color="#FFFFFF" />
          ) : state === 'PROCESSING' ? (
            <Ionicons name="sparkles" size={size * 0.28} color="#FFFFFF" />
          ) : state === 'SPEAKING' ? (
            <Ionicons name="volume-high" size={size * 0.28} color={colors.background} />
          ) : (
            <Ionicons name="mic" size={size * 0.28} color={colors.background} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
  },
  orbGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  orbCore: {
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.35)',
    elevation: 8,
  },
});

