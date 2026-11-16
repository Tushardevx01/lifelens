/**
 * Backend API types — mirroring the FastAPI schemas.
 */

// ── Auth ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
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
  resting_heart_rate?: number | null; // 30-220 bpm

  // Digital
  screen_time_hours: number; // 0-24
  social_media_hours?: number | null; // >= 0
  unlock_count?: number | null; // >= 0

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
  resting_heart_rate?: number | null;
  screen_time_hours?: number;
  social_media_hours?: number | null;
  unlock_count?: number | null;
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
  resting_heart_rate?: number | null;
  screen_time_hours: number;
  social_media_hours: number | null;
  unlock_count?: number | null;
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
  source?: string | null;
  notes: string | null;
  created_at: string;
}

export interface TransactionCreate {
  amount: number;
  category: string;
  merchant: string;
  timestamp: string;
  is_discretionary?: boolean;
  source?: string;
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
  daily_burn_rate?: number;
  projected_eom_spend?: number;
  monthly_budget?: number;
  budget_remaining?: number;
  budget_run_rate_status?: string;
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
  distracting_minutes: number;
  productive_minutes: number;
  distraction_index: number;
  category_breakdown: Record<string, number>;
  top_apps: Array<{
    app_name: string;
    category: string;
    total_minutes: number;
    percentage: number;
  }>;
}

// ── Native Sleep Telemetry ──────────────────────────────────────────────────

export interface SleepInterval {
  id: string;
  user_id: string;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  stage: string;      // 'core' | 'deep' | 'rem' | 'awake' | 'in_bed'
  duration_minutes: number;
  created_at: string;
}

export interface SleepIntervalCreate {
  start_time: string;
  end_time: string;
  stage?: string;
  duration_minutes?: number;
}

export interface SleepIntervalBatchCreate {
  intervals: SleepIntervalCreate[];
}

export interface SleepSummaryResponse {
  date: string;
  total_sleep_hours: number;
  total_in_bed_hours: number;
  sleep_quality?: number;
  bedtime: string | null;
  wake_time?: string | null;
  deep_minutes?: number;
  rem_minutes?: number;
  core_minutes?: number;
  awake_minutes?: number;
  in_bed_minutes?: number;
  resting_heart_rate: number | null;
  stage_breakdown: Record<string, number>;
  circadian_drift_minutes: number;
  bedtime_variance_minutes?: number;
  phase_shift?: string;
  social_jetlag_minutes: number;
  sleep_score: number;
}

// ── Native Workout Telemetry ────────────────────────────────────────────────

export interface WorkoutSession {
  id: string;
  user_id: string;
  activity_type: string;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  duration_minutes: number;
  calories_burned?: number | null;
  steps?: number | null;
  intensity?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface WorkoutSessionCreate {
  activity_type?: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  calories_burned?: number | null;
  steps?: number | null;
  intensity?: string | null;
  notes?: string | null;
}

export interface WorkoutConsistencyResponse {
  current_streak?: number;
  streak_days: number;
  best_streak?: number;
  total_workouts_7d: number;
  total_active_minutes_7d?: number;
  total_minutes_7d: number;
  rest_day_adherence_pct?: number;
  rest_days_adherence: number;
  workout_skip_vulnerability?: number;
  skip_vulnerability: number;
  skip_risk_level?: string;
  recommendation?: string;
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
  task_completed?: boolean;
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

// ── Conversational AI Assistant (Phase 3) ───────────────────────────────────

export interface ToolCallRecord {
  tool: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export type ChatCardType =
  | 'sleep_analysis'
  | 'spending_breakdown'
  | 'productivity_patterns'
  | 'active_experiment'
  | 'anomalies_and_clusters'
  | 'lifescore_overview';

export interface ChatCardPayload {
  card_type: ChatCardType;
  title: string;
  data: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  tool_calls?: ToolCallRecord[];
  cards?: ChatCardPayload[];
  disclaimer?: string | null;
  created_at: string;
}

export interface ChatMessageRequest {
  message: string;
  session_id?: string | null;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionDetail {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface StarterPrompt {
  id: string;
  label: string;
  prompt: string;
  category: string;
  icon: string;
}

// ── Voice Experience (Phase 4: STT & TTS) ───────────────────────────────────

export interface VoiceTranscribeResponse {
  text: string;
  language: string;
  duration_seconds: number;
  confidence?: number | null;
}

export interface VoiceSynthesizeRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface VoiceSynthesizeResponse {
  audio_base64: string;
  format: string;
  mime_type: string;
  duration_estimate_seconds: number;
  cleaned_text: string;
}

export interface VoiceChatResponse {
  id: string;
  session_id: string;
  transcribed_query: string;
  reply_text: string;
  spoken_text: string;
  audio_base64?: string | null;
  format: string;
  tool_calls?: ToolCallRecord[];
  cards?: ChatCardPayload[];
  disclaimer?: string | null;
  created_at: string;
}

// ── Automated Device Connectors & Native Ingestion (Phase 5) ────────────────

export type DataConnectorType =
  | 'APPLE_HEALTH'
  | 'GOOGLE_HEALTH_CONNECT'
  | 'DEVICE_USAGE'
  | 'SMS_PARSER'
  | 'PLAID'
  | 'FINVU_AA'
  | 'CSV_STATEMENT';

export type DataConnectorStatus = 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'ERROR';

export interface DataConnector {
  id: string;
  user_id: string;
  connector_type: DataConnectorType;
  status: DataConnectorStatus;
  is_enabled: boolean;
  last_sync_at?: string | null;
  sync_frequency_minutes: number;
  total_records_synced: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectorSyncLog {
  id: string;
  connector_id?: string | null;
  connector_type: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  records_ingested: number;
  records_deduplicated: number;
  details?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface HealthSleepInterval {
  start_time: string;
  end_time: string;
  stage: 'CORE' | 'DEEP' | 'REM' | 'AWAKE' | 'IN_BED' | string;
}

export interface HealthIngestPayload {
  date: string; // YYYY-MM-DD
  source: 'APPLE_HEALTH' | 'GOOGLE_HEALTH_CONNECT' | 'MANUAL';
  sleep_hours: number;
  sleep_quality: number;
  sleep_bedtime?: string | null;
  sleep_intervals?: HealthSleepInterval[];
  steps: number;
  active_minutes?: number | null;
  calories_burned?: number | null;
  resting_heart_rate?: number | null;
  auto_merge_daily_entry?: boolean;
}

export interface UsageSessionItem {
  app_name: string;
  app_category: string;
  duration_minutes: number;
  start_time: string;
  is_late_night?: boolean | null;
}

export interface UsageIngestPayload {
  date: string; // YYYY-MM-DD
  device_platform: 'ANDROID' | 'IOS' | 'WEB';
  total_screen_time_hours: number;
  social_media_hours?: number | null;
  unlock_count?: number | null;
  sessions: UsageSessionItem[];
  auto_merge_daily_entry?: boolean;
}

export interface SmsTransactionItem {
  amount: number;
  merchant: string;
  category: string;
  timestamp: string;
  is_discretionary: boolean;
  external_id: string;
  currency: string;
  notes?: string | null;
}

export interface SmsIngestPayload {
  transactions: SmsTransactionItem[];
  device_platform: 'ANDROID' | 'IOS';
  auto_merge_daily_entry?: boolean;
}

export interface StatementIngestPayload {
  institution: string;
  csv_content?: string | null;
  raw_transactions?: SmsTransactionItem[];
  auto_merge_daily_entry?: boolean;
}

export interface SyncResultResponse {
  success: boolean;
  connector_type: string;
  records_ingested: number;
  records_deduplicated: number;
  daily_entries_updated: number;
  details?: Record<string, unknown>;
  synced_at: string;
}

// ── Phase 6: Behavioral Risk Forecasters & AI Personal Life Briefings ─────────

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type BudgetRiskStatus = 'ON_TRACK' | 'CAUTION' | 'OVERRUN_IMMINENT' | 'DEFICIT_EXCEEDED';
export type CircadianStatus = 'STABLE' | 'PHASE_DELAY' | 'PHASE_ADVANCE' | 'IRREGULAR_SOCIAL_JETLAG';

export interface WorkoutSkipForecast {
  probability: number;
  risk_level: RiskLevel;
  confidence: number;
  primary_driver: string;
  contributing_factors: string[];
  mitigation_strategy: string;
  target_recommendation: string;
}

export interface BudgetDiscretionaryCategory {
  category: string;
  amount: number;
  percentage_of_spend: number;
}

export interface BudgetOverrunForecast {
  monthly_budget: number;
  current_spend: number;
  current_discretionary_spend: number;
  discretionary_ratio_pct: number;
  days_elapsed: number;
  days_remaining: number;
  current_daily_velocity: number;
  projected_eom_spend: number;
  projected_overrun: number;
  overrun_probability: number;
  risk_status: BudgetRiskStatus;
  recommended_daily_cap: number;
  top_discretionary_categories: BudgetDiscretionaryCategory[];
  actionable_advice: string;
}

export interface CircadianDriftForecast {
  status: CircadianStatus;
  alert_level: RiskLevel;
  bedtime_variance_minutes: number;
  max_shift_minutes: number;
  consecutive_drift_days: number;
  average_bedtime: string;
  average_wake_time: string;
  social_jetlag_minutes: number;
  resynchronization_protocol: string;
}

export interface CompositeRiskForecastResponse {
  date: string;
  workout_skip: WorkoutSkipForecast;
  budget_overrun: BudgetOverrunForecast;
  circadian_drift: CircadianDriftForecast;
  overall_risk_score: number;
  key_vulnerability_summary: string;
}

export interface DailyMorningBriefing {
  id: string;
  date: string;
  title: string;
  greeting: string;
  recovery_score: number;
  recovery_tier: 'OPTIMAL' | 'GOOD' | 'MODERATE' | 'RECOVERY_NEEDED';
  optimal_focus_window: string;
  secondary_focus_window: string;
  executive_summary: string;
  sleep_summary: string;
  risk_alerts: Array<{
    type: string;
    severity: string;
    title: string;
    message: string;
  }>;
  experiment_callout: {
    title: string;
    progress: string;
    rule: string;
    yesterday_adherence: string;
    message: string;
  } | null;
  micro_action: string;
  full_markdown: string;
  is_read: boolean;
  created_at: string;
}

export interface WeeklyReviewStory {
  id: string;
  week_start: string;
  week_end: string;
  title: string;
  avg_life_score: number;
  life_score_trend_delta: number;
  best_day: {
    date: string;
    score: number;
    highlight: string;
  };
  recovery_day: {
    date: string;
    highlight: string;
  };
  top_wins: string[];
  bottlenecks_identified: string[];
  experiments_evaluated: Array<{
    title: string;
    status: string;
    adherence: string;
    delta: string;
  }>;
  next_week_recommendation: {
    title: string;
    target_metric?: string;
    rule: string;
    expected_gain: string;
  };
  full_narrative_markdown: string;
  html_export_card: string;
  is_read: boolean;
  created_at: string;
}

export interface DynamicCorrelation {
  feature_a: string;
  feature_b: string;
  name_a: string;
  name_b: string;
  lag: number;
  r: number;
  p_value: number;
  sample_size: number;
  is_statistically_significant: boolean;
  strength: 'STRONG' | 'MODERATE' | 'EMERGING' | 'NEGLIGIBLE';
  direction: 'POSITIVE' | 'NEGATIVE';
  ci_lower: number;
  ci_upper: number;
  insight_narrative: string;
  epistemic_qualifier: string;
}
