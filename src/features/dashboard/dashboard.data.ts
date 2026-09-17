import { DashboardData } from './dashboard.types';

export const mockDashboardData: DashboardData = {
  lifeScore: {
    overall: 84.5,
    sleep: 88,
    productivity: 85,
    health: 82,
    finance: 80,
    change: 2.3,
  },
  insight: {
    id: '1',
    title: "Today's Insight",
    summary:
      'High deep work (5.5 hrs) combined with 8.1 hrs sleep and 8,900 steps.',
    whyItMatters:
      'Low distraction levels (<45 min social media) strongly correlates with your top quartile Life Score.',
    actionForToday:
      "Maintain today's wind-down routine at 10:30 PM to sustain tomorrow's focus surge.",
    type: 'daily',
  },
  scoreBreakdown: [
    { category: 'sleep', score: 88, weight: 30, color: '#00D4AA' },
    { category: 'productivity', score: 85, weight: 25, color: '#4A9EFF' },
    { category: 'health', score: 82, weight: 25, color: '#B8FF00' },
    { category: 'finance', score: 80, weight: 20, color: '#FF9F43' },
  ],
  trendData: [
    { date: 'Aug 1', lifeScore: 78, sleep: 82, productivity: 75 },
    { date: 'Aug 5', lifeScore: 80, sleep: 84, productivity: 78 },
    { date: 'Aug 9', lifeScore: 76, sleep: 80, productivity: 72 },
    { date: 'Aug 13', lifeScore: 82, sleep: 86, productivity: 80 },
    { date: 'Aug 17', lifeScore: 81, sleep: 85, productivity: 79 },
    { date: 'Aug 21', lifeScore: 83, sleep: 87, productivity: 82 },
    { date: 'Aug 25', lifeScore: 84.5, sleep: 88, productivity: 85 },
  ],
  prediction: {
    score: 88,
    confidence: 'low',
    keyDriver: 'Sleep Quality (8.1 hrs) & Low Evening Screen Time',
    recommendation:
      'Schedule your most challenging deep-work task between 9:30 AM and 12:00 PM.',
  },
  insights: [
    {
      id: '1',
      title: 'Sleep Consistency Booster',
      subtitle: 'Regular sleep times improve your score',
      icon: 'moon',
    },
    {
      id: '2',
      title: 'Daily Steps → Energy Level',
      subtitle: '8,900 steps today boosted energy by 12%',
      icon: 'footsteps',
    },
    {
      id: '3',
      title: 'Social Media Time → Mood Rating',
      subtitle: 'Low usage today correlated with better mood',
      icon: 'phone-portrait',
    },
  ],
  clusters: [
    { label: 'High Output & Active', color: '#00D4AA', active: true },
    { label: 'Rest & Recovery', color: '#4A9EFF', active: false },
    { label: 'Distracted & Low Energy', color: '#FF9F43', active: false },
  ],
  correlations: [
    {
      id: '1',
      score: 0.74,
      positive: true,
      title: 'Sleep Duration → Deep Work Output',
      description:
        'Every additional hour of sleep above 7h yields better deep-work performance.',
    },
    {
      id: '2',
      score: 0.68,
      positive: true,
      title: 'Daily Steps → Energy Level',
      description:
        'Exceeding 8,000 steps strongly correlates with higher evening energy scores.',
    },
    {
      id: '3',
      score: -0.62,
      positive: false,
      title: 'Social Media Time → Mood Rating',
      description:
        'Social media usage over 90 minutes correlates with lower mood ratings.',
    },
  ],
  anomalies: [
    {
      id: '1',
      date: '2026-08-23',
      title: 'Distraction Level',
      description:
        'Unusual spike in social media usage (3.8h) accompanied by late bedtime (1:45 AM).',
      severity: 'medium',
    },
  ],
};
