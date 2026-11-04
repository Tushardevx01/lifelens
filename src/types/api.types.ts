/**
 * Backend API types — mirroring the FastAPI schemas.
 */

// ── Auth ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  timezone?: string;
  created_at: string;
}

// ── Daily Entries ────────────────────────────────────────────────────────────

export interface DailyEntryCreate {
  date: string; // "YYYY-MM-DD"

  // Sleep
  sleep_hours: number; // 0-24
  sleep_quality: number; // 1-5 (matches database ck_sleep_quality_range)
  sleep_bedtime?: string | null; // "HH:MM"

  // Digital
  screen_time_hours: number; // 0-24
  social_media_hours?: number | null; // >= 0

  // Health
  steps: number; // >= 0
  active_minutes?: number | null; // >= 0
  calories_burned?: number | null; // >= 0

  // Productivity
  deep_work_hours: number; // 0-24
  tasks_completed?: number | null; // >= 0

  // Finance
  daily_spend: number; // >= 0
  spend_category?: string | null; // max 50 chars

  // Subjective
  mood_score?: number | null; // 1-10 (matches database ck_mood_score_range)
  energy_level?: number | null; // 1-5 (matches database ck_energy_level_range)
  notes?: string | null; // max 1000 chars

  // Legacy/backward compatibility aliases
  mood?: number | null;
  exercise_minutes?: number | null;
}

export interface DailyEntryUpdate {
  sleep_hours?: number;
  sleep_quality?: number; // 1-5
  sleep_bedtime?: string | null; // "HH:MM"
  screen_time_hours?: number;
  social_media_hours?: number | null;
  steps?: number;
  active_minutes?: number | null;
  calories_burned?: number | null;
  deep_work_hours?: number;
  tasks_completed?: number | null;
  daily_spend?: number;
  spend_category?: string | null;
  mood_score?: number | null;
  energy_level?: number | null;
  notes?: string | null;

  // Legacy aliases
  mood?: number | null;
  exercise_minutes?: number | null;
}

export interface DailyEntry {
  id: string;
  user_id: string;
  date: string;
  sleep_hours: number;
  sleep_quality: number;
  sleep_bedtime: string | null;
  screen_time_hours: number;
  social_media_hours: number | null;
  steps: number;
  active_minutes: number | null;
  calories_burned: number | null;
  deep_work_hours: number;
  tasks_completed: number | null;
  daily_spend: number;
  spend_category: string | null;
  mood_score: number | null;
  energy_level: number | null;
  notes: string | null;
  created_at: string;

  // Legacy aliases for components that might read them
  mood?: number | null;
  exercise_minutes?: number | null;
}

export interface CsvUploadError {
  row: number;
  error: string;
}

export interface CsvUploadResponse {
  imported: number;
  errors: (CsvUploadError | string | Record<string, unknown>)[];
  total_rows: number;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface DashboardResponse {
  life_score: number;
  life_score_change_from_yesterday: number;
  life_score_components: {
    sleep: number;
    productivity: number;
    health: number;
    finance: number;
  };
  daily_summary: {
    title: string;
    what: string;
    why: string;
    action: string;
  } | null;
  top_insights: Array<{
    id: string;
    title: string;
    message: string;
    severity: string;
  }>;
  trend_data: Array<{
    date: string;
    life_score: number;
    sleep_score: number;
    productivity_score: number;
    cluster_name?: string | null;
    is_anomaly?: boolean;
  }>;
}

export interface PredictionResponse {
  predicted_productivity: number;
  key_driver: string;
  improvement_tip: string;
  confidence: number;
}

export interface InsightResponse {
  id: string;
  date: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  insight_type: string;
}

export interface LifeScoreHistoryPoint {
  date: string;
  life_score: number;
  sleep_score: number;
  productivity_score: number;
  health_score: number;
  finance_score: number;
  cluster_name: string | null;
  is_anomaly: boolean;
}

export interface ClusterResponse {
  clusters: Array<{
    cluster_name: string;
    count: number;
    avg_life_score: number;
  }>;
}

export interface AnomalyResponse {
  date: string;
  anomaly_score: number;
  insight_message: string;
}

export interface CorrelationResponse {
  name_a: string;
  name_b: string;
  r: number;
  insight_message: string;
}

// ── Granular Telemetry (Phase 1) ─────────────────────────────────────────────

export interface FinancialTransaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  merchant: string;
  timestamp: string; // ISO 8601
  is_discretionary: boolean;
  notes: string | null;
  created_at: string;
}

export interface TransactionCreate {
  amount: number;
  category: string;
  merchant: string;
  timestamp: string;
  is_discretionary?: boolean;
  notes?: string | null;
}

export interface TransactionBatchCreate {
  transactions: TransactionCreate[];
}

export interface TransactionSummary {
  total_spend: number;
  discretionary_spend: number;
  non_discretionary_spend: number;
  discretionary_percentage: number;
  transaction_count: number;
  category_breakdown: Record<string, number>;
  top_merchants: Array<{
    merchant: string;
    total_spend: number;
    count: number;
  }>;
}

export interface AppUsageSession {
  id: string;
  user_id: string;
  app_name: string;
  app_category: string;
  duration_minutes: number;
  start_time: string; // ISO 8601
  is_late_night: boolean;
  created_at: string;
}

export interface AppUsageCreate {
  app_name: string;
  app_category: string;
  duration_minutes: number;
  start_time: string;
  is_late_night?: boolean | null;
}

export interface AppUsageBatchCreate {
  sessions: AppUsageCreate[];
}

export interface AppUsageSummary {
  total_minutes: number;
  total_hours: number;
  late_night_minutes: number;
  category_breakdown: Record<string, number>;
  top_apps: Array<{
    app_name: string;
    category: string;
    total_minutes: number;
    percentage: number;
  }>;
}

export interface FocusStudySession {
  id: string;
  user_id: string;
  subject_or_task: string;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  duration_minutes: number;
  self_reported_focus: number; // 1-5
  distraction_count: number;
  notes: string | null;
  created_at: string;
}

export interface FocusSessionCreate {
  subject_or_task: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  self_reported_focus: number; // 1-5
  distraction_count?: number;
  notes?: string | null;
}

export interface FocusSessionSummary {
  total_duration_minutes: number;
  total_hours: number;
  session_count: number;
  average_focus_rating: number;
  total_distractions: number;
  subject_breakdown: Record<string, number>;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  frequency: string;
  target_per_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitCreate {
  name: string;
  domain?: string;
  frequency?: string;
  target_per_day?: number;
}

export interface HabitUpdate {
  name?: string;
  domain?: string;
  frequency?: string;
  target_per_day?: number;
  is_active?: boolean;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value: number;
  notes: string | null;
  created_at: string;
}

export interface HabitLogCreate {
  habit_id: string;
  date: string;
  completed?: boolean;
  value?: number;
  notes?: string | null;
}

export interface HabitWithStreak {
  id: string;
  name: string;
  domain: string;
  frequency: string;
  target_per_day: number;
  is_active: boolean;
  current_streak: number;
  best_streak: number;
  completed_today: boolean;
  completion_rate_7d: number;
  history_7d: Array<{
    date: string;
    day_name: string;
    completed: boolean;
  }>;
}

// ── Behavioral Experiments (Phase 2) ────────────────────────────────────────

export type ExperimentStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export type ExperimentOutcome =
  | 'PENDING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'INCONCLUSIVE'
  | 'NO_EFFECT'
  | 'NEGATIVE';

export interface Experiment {
  id: string;
  user_id: string;
  recommendation_source_id: string | null;
  title: string;
  hypothesis: string;
  target_metric: string;
  desired_direction: 'INCREASE' | 'DECREASE';
  intervention_rule: string;
  duration_days: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  baseline_start: string;
  baseline_end: string;
  baseline_mean: number | null;
  baseline_std: number | null;
  baseline_sample_size: number | null;
  status: ExperimentStatus;
  treatment_mean: number | null;
  treatment_std: number | null;
  treatment_sample_size: number | null;
  outcome_delta: number | null;
  outcome_delta_pct: number | null;
  effect_size: number | null;
  p_value: number | null;
  is_statistically_significant: boolean | null;
  adherence_rate: number | null;
  outcome_verdict: ExperimentOutcome;
  evaluation_summary: string | null;
  user_rating: number | null;
  user_reflection: string | null;
  adopted_as_habit: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExperimentCreate {
  title: string;
  hypothesis: string;
  target_metric: string;
  desired_direction?: 'INCREASE' | 'DECREASE';
  intervention_rule: string;
  duration_days?: number;
  start_date?: string;
  baseline_start?: string;
  baseline_end?: string;
  recommendation_source_id?: string | null;
}

export interface ExperimentUpdate {
  title?: string;
  hypothesis?: string;
  intervention_rule?: string;
  status?: ExperimentStatus;
  user_rating?: number;
  user_reflection?: string;
  adopted_as_habit?: boolean;
}

export interface ExperimentCheckin {
  id: string;
  experiment_id: string;
  user_id: string;
  date: string;
  adhered: boolean;
  metric_value: number | null;
  notes: string | null;
  created_at: string;
}

export interface ExperimentCheckinCreate {
  date: string;
  adhered: boolean;
  metric_value?: number | null;
  notes?: string | null;
}

export interface DailyAdherencePoint {
  day_number: number;
  date: string;
  adhered: boolean;
  metric_value: number | null;
}

export interface ActiveExperimentProgress {
  experiment: Experiment;
  current_day: number;
  days_remaining: number;
  total_days: number;
  progress_percentage: number;
  checked_in_today: boolean;
  today_adherence: boolean | null;
  checkins_completed: number;
  days_adhered: number;
  current_adherence_rate: number;
  current_treatment_mean: number | null;
  baseline_mean: number | null;
  interim_delta: number | null;
  interim_delta_pct: number | null;
  daily_history: DailyAdherencePoint[];
}

export interface ExperimentEvaluation {
  experiment_id: string;
  title: string;
  target_metric: string;
  desired_direction: 'INCREASE' | 'DECREASE';
  duration_days: number;
  status: ExperimentStatus;
  baseline_start: string;
  baseline_end: string;
  baseline_mean: number;
  baseline_std: number;
  baseline_sample_size: number;
  treatment_start: string;
  treatment_end: string;
  treatment_mean: number;
  treatment_std: number;
  treatment_sample_size: number;
  raw_delta: number;
  percentage_change: number;
  effect_size_cohens_d: number;
  p_value: number | null;
  is_statistically_significant: boolean;
  adherence_rate: number;
  days_adhered: number;
  days_missed: number;
  total_days_tracked: number;
  outcome_verdict: ExperimentOutcome;
  verdict_label: string;
  plain_english_synthesis: string;
  recommendation_next_steps: string;
  daily_comparison: Array<{
    day: number;
    date: string;
    metric_value: number | null;
    adhered: boolean | null;
    notes: string | null;
  }>;
}

export interface ExperimentCompleteRequest {
  user_rating?: number;
  user_reflection?: string;
  adopt_as_habit?: boolean;
  habit_domain?: string;
}

export interface ExperimentTemplate {
  id: string;
  title: string;
  category: string;
  target_metric: string;
  desired_direction: 'INCREASE' | 'DECREASE';
  duration_days: number;
  intervention_rule: string;
  hypothesis: string;
  scientific_rationale: string;
  icon_name: string;
}



