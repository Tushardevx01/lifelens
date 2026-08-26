import { ScoreCategory } from './dashboard.types';

export const getCategoryColor = (category: ScoreCategory): string => {
  const colors: Record<ScoreCategory, string> = {
    sleep: '#00D4AA',
    productivity: '#4A9EFF',
    health: '#B8FF00',
    finance: '#FF9F43',
  };
  return colors[category];
};

export const getCategoryLabel = (category: ScoreCategory): string => {
  const labels: Record<ScoreCategory, string> = {
    sleep: 'Sleep',
    productivity: 'Productivity',
    health: 'Health',
    finance: 'Finance',
  };
  return labels[category];
};

export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#00D4AA';
  if (score >= 60) return '#FF9F43';
  return '#FF4444';
};

export const getConfidenceLabel = (confidence: string): string => {
  const labels: Record<string, string> = {
    low: 'Limited data',
    medium: 'Moderate data',
    high: 'High confidence',
  };
  return labels[confidence] || 'Unknown';
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getShortDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};
