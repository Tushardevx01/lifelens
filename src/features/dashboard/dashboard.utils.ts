import { ScoreCategory } from './dashboard.types';

export const getCategoryColor = (category: ScoreCategory): string => {
  const colors: Record<ScoreCategory, string> = {
    sleep: '#7C3AED',
    productivity: '#2563EB',
    health: '#16A34A',
    finance: '#EA580C',
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
  if (score >= 80) return '#16A34A';
  if (score >= 60) return '#D97706';
  return '#DC2626';
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
