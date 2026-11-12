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
    { category: 'sleep', score: 88, weight: 30, color: '#7C3AED' },
    { category: 'productivity', score: 85, weight: 25, color: '#2563EB' },
    { category: 'health', score: 82, weight: 25, color: '#16A34A' },
    { category: 'finance', score: 80, weight: 20, color: '#EA580C' },
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
  morningBriefing: {
    id: 'mock-morning-1',
    date: '2026-11-07',
    title: 'Morning Briefing — Saturday, Nov 07',
    greeting: 'Good morning, Priya!',
    recovery_score: 84.0,
    recovery_tier: 'OPTIMAL',
    optimal_focus_window: '09:30 AM – 12:00 PM',
    secondary_focus_window: '03:30 PM – 05:00 PM',
    executive_summary:
      'Recovery score is 84/100 (Optimal). Your peak cognitive window is 09:30 AM – 12:00 PM. Tackle your primary deep work task before lunch.',
    sleep_summary:
      'You logged 8.1 hours of restorative sleep at 23:15 with 5/5 quality rating. Heart rate variability is balanced.',
    risk_alerts: [
      {
        type: 'BUDGET',
        severity: 'LOW',
        title: 'Budget Safe',
        message: 'Spending velocity is ₹840/day against a ₹1,166/day cap. Healthy buffer remaining.',
      },
    ],
    experiment_callout: {
      title: 'Digital Sunset Challenge',
      progress: 'Day 5 of 7',
      rule: 'Screen cutoff by 10:30 PM',
      yesterday_adherence: '✓ Followed',
      message: 'Day 5 of 7. Target rule: Keep phone outside bedroom by 10:30 PM.',
    },
    micro_action: 'Block out 09:30 AM – 12:00 PM for single-task focus. Take a 15-min walk after lunch.',
    full_markdown:
      '# 🌅 Morning Briefing\n\n> **Good morning, Priya!** Recovery score is 84/100.\n\n## 1. Physical Recovery\n- **Score:** 84/100 (Optimal)\n- **Sleep:** 8.1h\n\n## 2. Focus Window\n- **Peak:** 09:30 AM – 12:00 PM',
    is_read: false,
    created_at: '2026-11-07T06:30:00Z',
  },
  riskForecast: {
    date: '2026-11-07',
    workout_skip: {
      probability: 0.18,
      risk_level: 'LOW',
      confidence: 0.85,
      primary_driver: 'Optimal rest and consistent momentum',
      contributing_factors: ['Steady 8.1h sleep duration', 'Consecutive active streak'],
      mitigation_strategy: 'Pre-commit to a specific workout time window before lunch.',
      target_recommendation: 'Full planned training session (45-60 min).',
    },
    budget_overrun: {
      monthly_budget: 35000,
      current_spend: 11400,
      current_discretionary_spend: 3800,
      discretionary_ratio_pct: 33.3,
      days_elapsed: 7,
      days_remaining: 23,
      current_daily_velocity: 1628.5,
      projected_eom_spend: 48855.5,
      projected_overrun: 13855.5,
      overrun_probability: 0.88,
      risk_status: 'OVERRUN_IMMINENT',
      recommended_daily_cap: 1026.0,
      top_discretionary_categories: [
        { category: 'Food Delivery', amount: 2400, percentage_of_spend: 21.1 },
        { category: 'Online Shopping', amount: 1400, percentage_of_spend: 12.3 },
      ],
      actionable_advice:
        'At current daily burn of ₹1,628/day, you are on track to exceed budget by ₹13,855. Keep daily spending under ₹1,026/day to balance your ledger.',
    },
    circadian_drift: {
      status: 'STABLE',
      alert_level: 'LOW',
      bedtime_variance_minutes: 22.4,
      max_shift_minutes: 35.0,
      consecutive_drift_days: 0,
      average_bedtime: '23:15',
      average_wake_time: '07:15',
      social_jetlag_minutes: 35.0,
      resynchronization_protocol:
        'Circadian rhythm is stable. Your sleep-wake schedule demonstrates high consistency, providing optimal hormonal and cognitive restoration.',
    },
    overall_risk_score: 42.5,
    key_vulnerability_summary:
      'Spending run-rate exceeding monthly budget by ₹13,856 • Physical readiness and circadian rhythm are optimal.',
  },
  latestEntry: {
    id: 'mock-entry-today',
    user_id: 'mock-user',
    date: '2026-08-25',
    steps: 8900,
    active_minutes: 45,
    calories_burned: 520,
    resting_heart_rate: 64,
    sleep_hours: 8.1,
    sleep_quality: 5,
    sleep_bedtime: '23:15',
    deep_work_hours: 5.5,
    tasks_completed: 6,
    daily_spend: 650,
    spend_category: 'Food & Dining',
    screen_time_hours: 3.2,
    social_media_hours: 0.75,
    unlock_count: 42,
    mood_score: 8,
    energy_level: 4,
    notes: 'Strong focus morning block after consistent 8-hour sleep.',
    created_at: '2026-08-25T20:00:00Z',
  },
};
