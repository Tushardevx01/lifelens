"""
Unit and statistical tests for LifeLens Behavioral Experimentation Engine (Phase 2).
Tests statistical formulas, Cohen's d, Welch's t-test, directionality logic,
adherence calculations, and narrative synthesis.
"""

import unittest
import math
from app.ml.experiment_evaluator import (
    ExperimentOutcomeEnum,
    compute_distribution_stats,
    compute_cohens_d,
    compute_welch_ttest,
    evaluate_experiment_results,
    EXPERIMENT_TEMPLATES,
)


class TestExperimentStatistics(unittest.TestCase):
    def test_distribution_stats_empty_and_single(self):
        empty = compute_distribution_stats([])
        self.assertEqual(empty["n"], 0)
        self.assertEqual(empty["mean"], 0.0)
        self.assertEqual(empty["std"], 0.0)

        single = compute_distribution_stats([7.5])
        self.assertEqual(single["n"], 1)
        self.assertEqual(single["mean"], 7.5)
        self.assertEqual(single["std"], 0.0)

    def test_distribution_stats_normal_series(self):
        data = [6.0, 7.0, 8.0, 7.0, 7.0]
        stats = compute_distribution_stats(data)
        self.assertEqual(stats["n"], 5)
        self.assertEqual(stats["mean"], 7.0)
        self.assertAlmostEqual(stats["std"], 0.707, places=2)
        self.assertEqual(stats["median"], 7.0)

    def test_cohens_d_effect_size(self):
        # Baseline: mean=6.0, std=1.0, n=14
        # Treatment: mean=7.5, std=1.0, n=7
        d = compute_cohens_d(6.0, 1.0, 14, 7.5, 1.0, 7)
        self.assertGreater(d, 1.0)  # Large effect size

        # Zero difference
        d_zero = compute_cohens_d(7.0, 1.0, 10, 7.0, 1.0, 10)
        self.assertEqual(d_zero, 0.0)

        # Zero variance but different means
        d_no_var = compute_cohens_d(6.0, 0.0, 5, 8.0, 0.0, 5)
        self.assertGreater(d_no_var, 0.0)

    def test_welch_ttest_computation(self):
        baseline = [5.5, 6.0, 5.8, 6.2, 5.9, 6.1, 5.7]
        treatment = [7.2, 7.5, 7.8, 7.4, 7.6, 7.3, 7.7]

        t_stat, p_val = compute_welch_ttest(baseline, treatment)
        self.assertGreater(t_stat, 5.0)  # Treatment significantly higher
        self.assertLess(p_val, 0.01)    # Statistically significant

    def test_evaluation_success_increase_metric(self):
        # Test: Digital Sunset increasing Sleep
        baseline = [6.0, 5.8, 6.2, 5.9, 6.1, 5.7, 6.3]
        treatment = [7.2, 7.5, 7.8, 7.4, 7.6, 7.3, 7.7]
        adherence = [True, True, True, True, True, False, True]  # 6/7 = 85.7%

        res = evaluate_experiment_results(
            baseline_values=baseline,
            treatment_values=treatment,
            desired_direction="INCREASE",
            checkin_adherence=adherence,
            target_metric_label="sleep_hours",
            intervention_rule="No screen time 1h before bed",
        )

        self.assertEqual(res["outcome_verdict"], ExperimentOutcomeEnum.SUCCESS)
        self.assertGreater(res["raw_delta"], 1.0)
        self.assertGreater(res["percentage_change"], 15.0)
        self.assertGreater(res["effect_size_cohens_d"], 0.8)
        self.assertTrue(res["is_statistically_significant"])
        self.assertIn("clear success", res["plain_english_synthesis"].lower())

    def test_evaluation_success_decrease_metric(self):
        # Test: Social Media Cap decreasing Screen Time
        baseline = [5.5, 6.0, 5.8, 6.2, 5.9, 6.1, 6.5]  # ~6h screen time
        treatment = [3.2, 3.5, 3.8, 3.4, 3.6, 3.3, 3.7]  # ~3.5h screen time (-2.5h)
        adherence = [True, True, True, True, True, True, True]

        res = evaluate_experiment_results(
            baseline_values=baseline,
            treatment_values=treatment,
            desired_direction="DECREASE",
            checkin_adherence=adherence,
            target_metric_label="screen_time_hours",
            intervention_rule="Max 30m social media per day",
        )

        # For DECREASE, negative raw delta is SUCCESS!
        self.assertEqual(res["outcome_verdict"], ExperimentOutcomeEnum.SUCCESS)
        self.assertLess(res["raw_delta"], -1.5)
        self.assertLess(res["percentage_change"], -20.0)

    def test_evaluation_no_effect(self):
        baseline = [7.0, 7.1, 6.9, 7.0, 7.2, 6.8, 7.0]
        treatment = [7.0, 7.1, 7.0, 6.9, 7.1, 7.0, 7.0]
        adherence = [True, True, True, True, True, True, True]

        res = evaluate_experiment_results(
            baseline_values=baseline,
            treatment_values=treatment,
            desired_direction="INCREASE",
            checkin_adherence=adherence,
            target_metric_label="sleep_hours",
            intervention_rule="Drink chamomile tea",
        )

        self.assertEqual(res["outcome_verdict"], ExperimentOutcomeEnum.NO_EFFECT)
        self.assertIn("virtually unchanged", res["plain_english_synthesis"].lower())

    def test_evaluation_negative_outcome(self):
        # Metric worsened
        baseline = [7.5, 7.8, 7.4, 7.6, 7.5, 7.7, 7.6]
        treatment = [5.5, 5.8, 5.4, 5.6, 5.5, 5.7, 5.6]
        adherence = [True, True, True, True, True, True, True]

        res = evaluate_experiment_results(
            baseline_values=baseline,
            treatment_values=treatment,
            desired_direction="INCREASE",
            checkin_adherence=adherence,
            target_metric_label="sleep_hours",
            intervention_rule="Late night workout",
        )

        self.assertEqual(res["outcome_verdict"], ExperimentOutcomeEnum.NEGATIVE)
        self.assertIn("negatively", res["plain_english_synthesis"].lower())

    def test_evaluation_insufficient_data(self):
        res = evaluate_experiment_results(
            baseline_values=[6.5],
            treatment_values=[7.0],  # Only 1 data point
            desired_direction="INCREASE",
        )
        self.assertEqual(res["outcome_verdict"], ExperimentOutcomeEnum.INCONCLUSIVE)

    def test_adversarial_zero_baseline(self):
        # Baseline is 0.0 (e.g., 0 meditation or 0 deep work hours)
        baseline = [0.0, 0.0, 0.0, 0.0, 0.0]
        treatment = [1.5, 2.0, 1.8, 2.2, 1.9]
        adherence = [True, True, True, True, True]

        res = evaluate_experiment_results(
            baseline_values=baseline,
            treatment_values=treatment,
            desired_direction="INCREASE",
            checkin_adherence=adherence,
            target_metric_label="deep_work_hours",
            intervention_rule="Morning focus block",
        )
        self.assertEqual(res["outcome_verdict"], ExperimentOutcomeEnum.SUCCESS)
        self.assertGreater(res["raw_delta"], 0)
        self.assertFalse(math.isnan(res["percentage_change"]))

    def test_adversarial_all_zero_adherence(self):
        # Even if metric moved, 0% adherence cannot be counted as SUCCESS
        baseline = [6.0, 6.0, 6.0]
        treatment = [8.0, 8.0, 8.0]
        adherence = [False, False, False]

        res = evaluate_experiment_results(
            baseline_values=baseline,
            treatment_values=treatment,
            desired_direction="INCREASE",
            checkin_adherence=adherence,
            target_metric_label="sleep_hours",
        )
        self.assertNotEqual(res["outcome_verdict"], ExperimentOutcomeEnum.SUCCESS)
        self.assertEqual(res["adherence_rate"], 0.0)

    def test_adversarial_large_scale_values(self):
        # Daily steps (e.g. 5,000 to 12,000)
        baseline = [5200.0, 4800.0, 5100.0, 4900.0, 5300.0]
        treatment = [11500.0, 12200.0, 11800.0, 12500.0, 12000.0]
        adherence = [True, True, True, True, True]

        res = evaluate_experiment_results(
            baseline_values=baseline,
            treatment_values=treatment,
            desired_direction="INCREASE",
            checkin_adherence=adherence,
            target_metric_label="steps",
            intervention_rule="20-min evening walk",
        )
        self.assertEqual(res["outcome_verdict"], ExperimentOutcomeEnum.SUCCESS)
        self.assertGreater(res["raw_delta"], 6000)
        self.assertGreater(res["effect_size_cohens_d"], 5.0)

    def test_templates_catalog_validity(self):
        self.assertGreaterEqual(len(EXPERIMENT_TEMPLATES), 6)
        for tpl in EXPERIMENT_TEMPLATES:
            self.assertTrue(tpl["id"].startswith("tpl_"))
            self.assertIn(tpl["desired_direction"], ("INCREASE", "DECREASE"))
            self.assertGreaterEqual(tpl["duration_days"], 7)
            self.assertTrue(len(tpl["hypothesis"]) > 10)
            self.assertTrue(len(tpl["intervention_rule"]) > 5)


if __name__ == "__main__":
    unittest.main()
