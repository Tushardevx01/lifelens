export type {
  LifeScore,
  Insight,
  ScoreBreakdownItem,
  TrendDataPoint,
  ProductivityPrediction,
  InsightSummary,
  BehaviouralCluster,
  Correlation,
  AnomalyAlert,
  DashboardData,
  ScoreCategory,
} from './dashboard.types';

export { mockDashboardData } from './dashboard.data';
export {
  getCategoryColor,
  getCategoryLabel,
  getScoreColor,
  getConfidenceLabel,
  formatDate,
  getShortDate,
} from './dashboard.utils';

