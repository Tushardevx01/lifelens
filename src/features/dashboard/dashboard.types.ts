export type ScoreCategory = 'sleep' | 'productivity' | 'health' | 'finance';

export type LifeScore = {
  overall: number;
  sleep: number;
  productivity: number;
  health: number;
  finance: number;
  change: number;
};

export type Insight = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  actionForToday: string;
  type: 'daily' | 'weekly' | 'monthly';
};

export type ScoreBreakdownItem = {
  category: ScoreCategory;
  score: number;
  weight: number;
  color: string;
};

export type TrendDataPoint = {
  date: string;
  lifeScore: number;
  sleep: number;
  productivity: number;
};

export type ProductivityPrediction = {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  keyDriver: string;
  recommendation: string;
};

export type InsightSummary = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
};

export type BehaviouralCluster = {
  label: string;
  color: string;
  active: boolean;
};

export type Correlation = {
  id: string;
  score: number;
  positive: boolean;
  title: string;
  description: string;
};

export type AnomalyAlert = {
  id: string;
  date: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
};

export type DashboardData = {
  lifeScore: LifeScore;
  insight: Insight;
  scoreBreakdown: ScoreBreakdownItem[];
  trendData: TrendDataPoint[];
  prediction: ProductivityPrediction;
  insights: InsightSummary[];
  clusters: BehaviouralCluster[];
  correlations: Correlation[];
  anomalies: AnomalyAlert[];
};
