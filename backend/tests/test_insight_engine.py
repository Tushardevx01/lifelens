"""
Unit tests for the rule-based Insight Engine.

Tests EVERY rule with:
  - data that FIRES the rule
  - data that does NOT fire the rule
  - edge cases (None values, boundary conditions)
"""

from app.ml.insight_engine import (
    run_insight_engine, Severity, _rule_chronic_sleep_debt, _rule_inconsistent_sleep,
    _rule_phone_killing_productivity, _rule_social_media_overuse,
    _rule_sedentary_day, _rule_no_deep_work, _rule_spending_spike, _rule_consecutive_low_mood,
    _rule_burnout_risk, _rule_anomaly_detected,
    _rule_streak_detection,
)


def _base_data() -> dict:
    """Return a 'neutral' day — no rules should fire."""
    return {
        'sleep_hours':           7.5,
        'sleep_score':           75.0,
        'sleep_7d_avg':          7.0,
        'sleep_7d_std':          0.5,
        'screen_time_hours':     3.0,
        'social_media_hours':    1.5,
        'steps':                 9000,
        'steps_7d_avg':          8500,
        'deep_work_hours':       4.0,
        'productivity_score':    65.0,
        'productivity_7d_avg':   60.0,
        'productivity_score_lag1': 60.0,
        'spend_ratio':           1.1,
        'daily_spend':           500.0,
        'mood_score':            7,
        'mood_score_lag1':       7,
        'energy_level':          3,
        'distraction_level':     0.3,
        'distraction_7d_avg':    0.3,
        'is_anomaly':            False,
        'anomaly_score':         0.2,
        'primary_anomaly_feature': None,
    }


class TestChronicSleepDebt:
    def test_fires_critical_under_5h5(self):
        d = _base_data()
        d['sleep_7d_avg'] = 5.0
        result = _rule_chronic_sleep_debt(d)
        assert result is not None
        assert result.severity == Severity.CRITICAL

    def test_fires_warning_between_5h5_and_6h5(self):
        d = _base_data()
        d['sleep_7d_avg'] = 6.0
        result = _rule_chronic_sleep_debt(d)
        assert result is not None
        assert result.severity == Severity.WARNING

    def test_no_fire_healthy_sleep(self):
        result = _rule_chronic_sleep_debt(_base_data())
        assert result is None


class TestInconsistentSleep:
    def test_fires_on_high_std(self):
        d = _base_data()
        d['sleep_7d_std'] = 2.5
        result = _rule_inconsistent_sleep(d)
        assert result is not None
        assert result.severity == Severity.WARNING

    def test_no_fire_consistent_sleep(self):
        result = _rule_inconsistent_sleep(_base_data())
        assert result is None


class TestPhoneKillingProductivity:
    def test_fires_when_screen_exceeds_deep_work(self):
        d = _base_data()
        d['screen_time_hours'] = 7.0
        d['deep_work_hours']   = 1.0
        result = _rule_phone_killing_productivity(d)
        assert result is not None
        assert result.severity == Severity.CRITICAL

    def test_no_fire_balanced(self):
        result = _rule_phone_killing_productivity(_base_data())
        assert result is None


class TestSocialMediaOveruse:
    def test_fires_warning_over_4h(self):
        d = _base_data()
        d['social_media_hours'] = 4.5
        result = _rule_social_media_overuse(d)
        assert result is not None
        assert result.severity == Severity.WARNING

    def test_fires_info_over_2h5(self):
        d = _base_data()
        d['social_media_hours'] = 3.0
        result = _rule_social_media_overuse(d)
        assert result is not None
        assert result.severity == Severity.INFO

    def test_no_fire_normal_usage(self):
        result = _rule_social_media_overuse(_base_data())
        assert result is None


class TestSedentaryDay:
    def test_fires_critical_under_2000(self):
        d = _base_data()
        d['steps'] = 1000
        result = _rule_sedentary_day(d)
        assert result is not None
        assert result.severity == Severity.CRITICAL

    def test_fires_warning_under_5000(self):
        d = _base_data()
        d['steps'] = 3000
        result = _rule_sedentary_day(d)
        assert result is not None
        assert result.severity == Severity.WARNING

    def test_no_fire_active_day(self):
        result = _rule_sedentary_day(_base_data())
        assert result is None


class TestNoDeepWork:
    def test_fires_on_zero_deep_work(self):
        d = _base_data()
        d['deep_work_hours'] = 0.0
        result = _rule_no_deep_work(d)
        assert result is not None

    def test_no_fire_with_deep_work(self):
        result = _rule_no_deep_work(_base_data())
        assert result is None


class TestSpendingSpike:
    def test_does_not_fire_for_ratio_1_0(self):
        """FIX 6.4: ratio==1.0 is the first-day default, should not fire."""
        d = _base_data()
        d['spend_ratio'] = 1.0
        result = _rule_spending_spike(d)
        assert result is None

    def test_fires_critical_over_3x(self):
        d = _base_data()
        d['spend_ratio'] = 3.5
        result = _rule_spending_spike(d)
        assert result is not None
        assert result.severity == Severity.CRITICAL

    def test_fires_warning_over_2x(self):
        d = _base_data()
        d['spend_ratio'] = 2.5
        result = _rule_spending_spike(d)
        assert result is not None
        assert result.severity == Severity.WARNING

    def test_no_fire_normal_spend(self):
        result = _rule_spending_spike(_base_data())
        assert result is None


class TestConsecutiveLowMood:
    def test_fires_both_low(self):
        d = _base_data()
        d['mood_score']     = 3
        d['mood_score_lag1'] = 4
        result = _rule_consecutive_low_mood(d)
        assert result is not None

    def test_no_fire_if_today_ok(self):
        d = _base_data()
        d['mood_score']     = 8
        d['mood_score_lag1'] = 3
        result = _rule_consecutive_low_mood(d)
        assert result is None

    def test_no_crash_on_none_mood(self):
        """FIX 6.2: None mood values must not cause TypeError."""
        d = _base_data()
        d['mood_score']     = None
        d['mood_score_lag1'] = None
        result = _rule_consecutive_low_mood(d)
        assert result is None

    def test_no_crash_on_partial_none(self):
        d = _base_data()
        d['mood_score']     = 3
        d['mood_score_lag1'] = None
        result = _rule_consecutive_low_mood(d)  # should not raise
        assert result is None


class TestBurnoutRisk:
    def test_fires_critical_both_low(self):
        d = _base_data()
        d['sleep_7d_avg']      = 5.5
        d['productivity_7d_avg'] = 35.0
        result = _rule_burnout_risk(d)
        assert result is not None
        assert result.severity == Severity.CRITICAL

    def test_no_fire_normal(self):
        result = _rule_burnout_risk(_base_data())
        assert result is None


class TestAnomalyDetected:
    def test_fires_on_anomaly(self):
        d = _base_data()
        d['is_anomaly']    = True
        d['anomaly_score'] = 0.8
        result = _rule_anomaly_detected(d)
        assert result is not None
        assert result.severity == Severity.WARNING

    def test_no_fire_normal_day(self):
        result = _rule_anomaly_detected(_base_data())
        assert result is None


class TestStreakDetection:
    def test_fires_on_streak(self):
        d = _base_data()
        d['productivity_score']     = 80.0
        d['productivity_score_lag1'] = 75.0
        d['productivity_7d_avg']    = 70.0
        result = _rule_streak_detection(d)
        assert result is not None
        assert result.severity == Severity.INFO

    def test_no_fire_low_productivity(self):
        result = _rule_streak_detection(_base_data())
        assert result is None


class TestRunInsightEngine:
    def test_neutral_day_returns_list(self):
        results = run_insight_engine(_base_data())
        assert isinstance(results, list)

    def test_results_sorted_by_severity(self):
        d = _base_data()
        # Force critical + warning + info
        d['sleep_7d_avg']     = 5.0   # → CRITICAL chronic sleep
        d['steps']            = 1000   # → CRITICAL sedentary
        d['sleep_7d_std']     = 2.5   # → WARNING inconsistent sleep
        results = run_insight_engine(d)
        sevs = [r.severity for r in results]
        # CRITICAL must come before WARNING, WARNING before INFO
        order_map = {Severity.CRITICAL: 0, Severity.WARNING: 1, Severity.INFO: 2}
        for i in range(len(sevs) - 1):
            assert order_map[sevs[i]] <= order_map[sevs[i + 1]], (
                f"Wrong order: {sevs[i]} before {sevs[i + 1]}"
            )

    def test_no_duplicate_titles(self):
        d = _base_data()
        d['sleep_7d_avg'] = 4.5
        d['steps']        = 500
        results = run_insight_engine(d)
        titles = [r.title for r in results]
        assert len(titles) == len(set(titles)), "Duplicate insight titles"

    def test_bad_day_generates_insights(self):
        d = _base_data()
        d['sleep_7d_avg']      = 4.0
        d['steps']             = 500
        d['deep_work_hours']   = 0.0
        d['screen_time_hours'] = 9.0
        results = run_insight_engine(d)
        assert len(results) >= 3
