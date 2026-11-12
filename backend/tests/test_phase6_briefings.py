"""
Unit and Statistical Tests for LifeLens Phase 6:
Natural Language Insight Synthesizer & Predictive Expansion.

Tests:
  - Workout Skip Risk Classifier (logistic weighting, bounds, edge cases)
  - Budget Overrun Forecaster (burn rate, daily cap, deficit exceeded)
  - Circadian Drift Detector (bedtime variance, phase delay, social jetlag)
  - Dynamic Multi-Lag Cross-Feature Correlations (Pearson r, p-value, Fisher CI)
  - Morning Briefing & Weekly Story Synthesis (recovery score, focus windows, HTML export)
"""

import unittest
from datetime import date, timedelta

from app.ml.risk_forecaster import (
    RiskLevel,
    BudgetRiskStatus,
    CircadianStatus,
    calculate_workout_skip_risk,
    forecast_budget_overrun,
    detect_circadian_drift,
    _time_to_minutes_from_midnight,
    _minutes_to_time_str,
)
from app.ml.dynamic_correlation import (
    compute_pearson_r,
    find_dynamic_correlations,
)
from app.ml.insight_synthesizer import (
    calculate_recovery_score,
    estimate_optimal_focus_windows,
    generate_morning_briefing,
    generate_weekly_review_story,
)


class TestWorkoutSkipRisk(unittest.TestCase):
    def test_optimal_rest_yields_low_risk(self):
        forecast = calculate_workout_skip_risk(
            sleep_hours=8.0,
            sleep_quality=5,
            bedtime="22:30",
            energy_level=9,
            steps_yesterday=8500,
            consecutive_inactive_days=0,
        )
        self.assertEqual(forecast.risk_level, RiskLevel.LOW)
        self.assertLess(forecast.probability, 0.30)
        self.assertIn("planned", forecast.target_recommendation.lower())

    def test_severe_sleep_deficit_yields_critical_risk(self):
        forecast = calculate_workout_skip_risk(
            sleep_hours=4.2,
            sleep_quality=1,
            bedtime="02:30",
            energy_level=2,
            steps_yesterday=3000,
            consecutive_inactive_days=3,
        )
        self.assertIn(forecast.risk_level, (RiskLevel.HIGH, RiskLevel.CRITICAL))
        self.assertGreater(forecast.probability, 0.75)
        self.assertIn("10-Minute Minimum", forecast.mitigation_strategy)

    def test_edge_cases_and_zero_values(self):
        # 0 sleep hours should not crash
        zero_sleep = calculate_workout_skip_risk(
            sleep_hours=0.0,
            sleep_quality=0,
            energy_level=0,
        )
        self.assertTrue(0.01 <= zero_sleep.probability <= 0.99)

        # None values handled gracefully
        none_vals = calculate_workout_skip_risk(
            sleep_hours=None,  # type: ignore
            sleep_quality=None,  # type: ignore
            bedtime=None,
        )
        self.assertTrue(0.01 <= none_vals.probability <= 0.99)


class TestBudgetOverrunForecaster(unittest.TestCase):
    def test_on_track_budget(self):
        # Day 10 of month, spent 5,000 of 30,000 budget
        ref = date(2026, 11, 10)
        forecast = forecast_budget_overrun(
            current_spend=5000.0,
            current_discretionary_spend=1500.0,
            monthly_budget=30000.0,
            as_of_date=ref,
        )
        self.assertEqual(forecast.risk_status, BudgetRiskStatus.ON_TRACK)
        self.assertLess(forecast.overrun_probability, 0.40)
        self.assertEqual(forecast.projected_overrun, 0.0)
        self.assertGreater(forecast.recommended_daily_cap, 500.0)

    def test_deficit_exceeded(self):
        # Spent 32,000 of 30,000 budget on day 15
        ref = date(2026, 11, 15)
        forecast = forecast_budget_overrun(
            current_spend=32000.0,
            current_discretionary_spend=12000.0,
            monthly_budget=30000.0,
            as_of_date=ref,
        )
        self.assertEqual(forecast.risk_status, BudgetRiskStatus.DEFICIT_EXCEEDED)
        self.assertEqual(forecast.overrun_probability, 1.0)
        self.assertGreater(forecast.projected_overrun, 2000.0)
        self.assertEqual(forecast.recommended_daily_cap, 0.0)

    def test_overrun_imminent_warning(self):
        # Day 10 of 30 days, spent 20,000 of 30,000 budget (velocity 2,000/day -> projected 60,000)
        ref = date(2026, 11, 10)
        forecast = forecast_budget_overrun(
            current_spend=20000.0,
            current_discretionary_spend=8000.0,
            monthly_budget=30000.0,
            as_of_date=ref,
            discretionary_by_category={"Food Delivery": 5000.0, "Shopping": 3000.0},
        )
        self.assertEqual(forecast.risk_status, BudgetRiskStatus.OVERRUN_IMMINENT)
        self.assertGreater(forecast.overrun_probability, 0.80)
        self.assertGreater(forecast.projected_overrun, 15000.0)
        self.assertEqual(len(forecast.top_discretionary_categories), 2)


class TestCircadianDriftDetector(unittest.TestCase):
    def test_time_conversions(self):
        self.assertEqual(_time_to_minutes_from_midnight("23:00"), -60)
        self.assertEqual(_time_to_minutes_from_midnight("00:30"), 30)
        self.assertEqual(_time_to_minutes_from_midnight("01:45"), 105)
        self.assertEqual(_minutes_to_time_str(-60), "23:00")
        self.assertEqual(_minutes_to_time_str(30), "00:30")

    def test_stable_circadian_rhythm(self):
        bedtimes = ["23:00", "23:15", "23:10", "23:05", "23:20"]
        forecast = detect_circadian_drift(bedtimes)
        self.assertEqual(forecast.status, CircadianStatus.STABLE)
        self.assertEqual(forecast.alert_level, RiskLevel.LOW)
        self.assertLess(forecast.bedtime_variance_minutes, 30.0)

    def test_phase_delay_consecutive_drift(self):
        # Shifting 1 hour later each night: 23:00 -> 00:30 -> 02:00 -> 03:30
        bedtimes = ["23:00", "00:30", "02:00", "03:30"]
        forecast = detect_circadian_drift(bedtimes)
        self.assertEqual(forecast.status, CircadianStatus.PHASE_DELAY)
        self.assertIn(forecast.alert_level, (RiskLevel.HIGH, RiskLevel.CRITICAL))
        self.assertGreater(forecast.consecutive_drift_days, 1)

    def test_phase_advance_is_signed_negative(self):
        # Bedtime moves earlier each night: 00:30 -> 23:45 -> 23:00 -> 22:15
        forecast = detect_circadian_drift(["00:30", "23:45", "23:00", "22:15"])
        self.assertLess(forecast.max_shift_minutes, 0)

    def test_social_jetlag_detection(self):
        # Mon-Thu 22:30, Fri-Sat 02:00 (social jetlag > 90 min)
        dates = [
            date(2026, 11, 2),  # Mon
            date(2026, 11, 3),  # Tue
            date(2026, 11, 4),  # Wed
            date(2026, 11, 5),  # Thu
            date(2026, 11, 6),  # Fri
            date(2026, 11, 7),  # Sat
        ]
        bedtimes = ["22:30", "22:30", "22:45", "22:30", "02:15", "02:30"]
        forecast = detect_circadian_drift(bedtimes, entry_dates=dates)
        self.assertEqual(forecast.status, CircadianStatus.IRREGULAR_SOCIAL_JETLAG)
        self.assertGreater(forecast.social_jetlag_minutes, 90.0)


class TestDynamicCorrelations(unittest.TestCase):
    def test_perfect_positive_correlation(self):
        x = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0]
        y = [2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0]
        r, p, low, high = compute_pearson_r(x, y)
        self.assertAlmostEqual(r, 1.0, places=2)
        self.assertLess(p, 0.001)
        self.assertGreaterEqual(low, 0.90)

    def test_negative_correlation_with_noise(self):
        x = [10.0, 9.0, 8.0, 7.0, 6.0, 5.0, 4.0]
        y = [2.0, 3.0, 4.1, 5.0, 5.9, 7.2, 8.0]
        r, p, low, high = compute_pearson_r(x, y)
        self.assertLess(r, -0.90)
        self.assertLess(p, 0.01)

    def test_multi_lag_finder(self):
        # 10 days of synthetic data
        entries = []
        for i in range(10):
            entries.append({
                "date": f"2026-11-{i+1:02d}",
                "sleep_hours": 6.0 + (i * 0.3),  # Increases over days
                "productivity_score": 50.0 + (i * 4.0),  # Increases over days
                "sleep_quality": 3 + (i % 3),
                "energy_level": 4 + (i % 4),
            })
        findings = find_dynamic_correlations(entries, min_sample_size=7)
        self.assertGreater(len(findings), 0)
        # Check first finding has epistemic qualifier
        f0 = findings[0]
        self.assertIn("not proven physical causation", f0.epistemic_qualifier)
        self.assertTrue(-1.0 <= f0.r <= 1.0)


class TestInsightSynthesizers(unittest.TestCase):
    def test_recovery_score_optimal_vs_depleted(self):
        rec_opt, tier_opt = calculate_recovery_score(
            sleep_hours=8.0,
            sleep_quality=5,
            bedtime_variance_minutes=15.0,
            resting_heart_rate=62,
            baseline_resting_hr=65.0,
        )
        self.assertEqual(tier_opt, "OPTIMAL")
        self.assertGreater(rec_opt, 85.0)

        rec_dep, tier_dep = calculate_recovery_score(
            sleep_hours=4.5,
            sleep_quality=1,
            bedtime_variance_minutes=95.0,
            resting_heart_rate=78,
            baseline_resting_hr=65.0,
        )
        self.assertEqual(tier_dep, "RECOVERY_NEEDED")
        self.assertLess(rec_dep, 50.0)

    def test_optimal_focus_windows_formatting(self):
        p_win, s_win = estimate_optimal_focus_windows(85.0, "07:00")
        self.assertIn("09:30 AM", p_win)
        self.assertIn("03:30 PM", s_win)

    def test_morning_briefing_synthesis(self):
        today = date(2026, 11, 7)
        briefing = generate_morning_briefing(
            today_date=today,
            sleep_hours=7.8,
            sleep_quality=4,
            bedtime_str="23:15",
            wake_time_str="07:15",
            resting_hr=63,
            user_name="Priya",
        )
        self.assertIn("Priya", briefing.greeting)
        self.assertTrue(briefing.recovery_score >= 70.0)
        self.assertIn("Morning Briefing", briefing.title)
        self.assertIn("# 🌅 Morning Briefing", briefing.full_markdown)
        self.assertIn("Micro-Action for Today", briefing.full_markdown)

    def test_weekly_review_story_synthesis(self):
        start = date(2026, 11, 1)
        end = date(2026, 11, 7)
        entries = [
            {"date": str(start + timedelta(days=i)), "sleep_hours": 7.5, "sleep_quality": 4, "steps": 8000, "deep_work_hours": 4.0, "life_score": 82.0, "daily_spend": 900.0}
            for i in range(7)
        ]
        story = generate_weekly_review_story(
            week_start=start,
            week_end=end,
            daily_entries=entries,
            discretionary_spend_total=2400.0,
            user_name="Priya",
        )
        self.assertEqual(story.avg_life_score, 82.0)
        self.assertGreater(len(story.top_wins), 0)
        self.assertIn("Sunday Evening Review", story.full_narrative_markdown)
        self.assertIn("<!DOCTYPE html>", story.html_export_card)
        self.assertIn("LifeLens Weekly Story", story.html_export_card)


if __name__ == "__main__":
    unittest.main()
