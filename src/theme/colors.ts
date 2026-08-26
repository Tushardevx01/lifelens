export const colors = {
  background: '#080908',
  surface: '#111311',
  surfaceSecondary: '#171917',
  border: '#292D29',
  borderLight: '#3A3F3A',

  primary: '#B8FF00',
  primaryBright: '#C8FF2C',
  primaryMuted: 'rgba(184, 255, 0, 0.15)',
  primaryGlow: 'rgba(184, 255, 0, 0.3)',

  text: '#F5F5F5',
  textSecondary: '#929792',
  textMuted: '#5F645F',

  error: '#FF4444',
  errorMuted: 'rgba(255, 68, 68, 0.15)',

  white: '#FFFFFF',
  black: '#000000',

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorToken = keyof typeof colors;
