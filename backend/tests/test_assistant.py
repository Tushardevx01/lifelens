"""
Unit tests for LifeLens Conversational AI Companion Engine (Phase 3).
Tests:
- Epistemic guardrails & causation vs correlation enforcement
- Medical diagnosis & prescription boundaries
- Crisis and self-harm safety deflection
- Non-judgmental tone sanitation
- Telemetry tool schemas and query intent detection
- Deterministic response synthesis and numerical formatting
- Session title generation
"""

import unittest
from app.ai.guardrails import (
    apply_guardrails,
    check_crisis_boundary,
    check_medical_boundary,
    sanitize_causal_claims,
    sanitize_judgmental_tone,
)
from app.ai.tools import TOOL_DECLARATIONS, TOOL_MAP
from app.ai.agent import detect_tool_intents, synthesize_deterministic_response
from app.services.assistant_service import generate_session_title, STARTER_PROMPTS


class TestAssistantGuardrails(unittest.TestCase):
    def test_crisis_boundary_deflection(self):
        query = "I feel hopeless and want to end my life"
        res = check_crisis_boundary(query)
        self.assertIsNotNone(res)
        self.assertIn("988", res)
        self.assertIn("Suicide & Crisis Lifeline", res)

    def test_medical_diagnosis_deflection(self):
        medical_queries = [
            "Can you diagnose me with chronic insomnia?",
            "What pill should I take for sleeping better?",
            "Prescribe a dosage of melatonin for me",
            "Do I have depression based on my low mood scores?",
        ]
        for q in medical_queries:
            res = check_medical_boundary(q)
            self.assertIsNotNone(res, f"Failed to deflect: {q}")
            self.assertIn("cannot provide medical diagnoses", res)

    def test_safe_lifestyle_query_not_deflected(self):
        safe_queries = [
            "Why was my sleep duration low yesterday?",
            "How much did I spend on dining this month?",
            "What were my deep work hours?",
            "How is my active experiment doing?",
        ]
        for q in safe_queries:
            self.assertIsNone(check_crisis_boundary(q))
            self.assertIsNone(check_medical_boundary(q))

    def test_judgmental_tone_sanitization(self):
        judgmental_text = "You failed your goal because you were lazy and slacked off."
        sanitized = sanitize_judgmental_tone(judgmental_text)
        self.assertNotIn("you failed", sanitized.lower())
        self.assertNotIn("lazy", sanitized.lower())
        self.assertNotIn("slacked off", sanitized.lower())
        self.assertIn("target was not reached", sanitized.lower())

    def test_epistemic_causal_claim_sanitization(self):
        causal_text = "This caused your fatigue because you used your phone late at night."
        sanitized = sanitize_causal_claims(causal_text)
        self.assertNotIn("this caused your", sanitized.lower())
        self.assertIn("coincided", sanitized.lower())

    def test_apply_guardrails_pipeline(self):
        text = "You were lazy and this caused your lower sleep score."
        sanitized, flags = apply_guardrails(text, "Why did I sleep poorly?")
        self.assertTrue(flags["disclaimer_applied"])
        self.assertTrue(flags["causation_scrubbed"])
        self.assertTrue(flags["judgmental_tone_scrubbed"])
        self.assertNotIn("lazy", sanitized)
        self.assertNotIn("caused your", sanitized)


class TestTelemetryToolsAndIntents(unittest.TestCase):
    def test_tool_declarations_schema(self):
        self.assertEqual(len(TOOL_DECLARATIONS), 6)
        tool_names = [t["function"]["name"] for t in TOOL_DECLARATIONS]
        expected = [
            "get_sleep_analysis",
            "get_spending_breakdown",
            "get_productivity_patterns",
            "get_active_experiments",
            "get_anomalies_and_clusters",
            "get_life_score_overview",
        ]
        for exp in expected:
            self.assertIn(exp, tool_names)
            self.assertIn(exp, TOOL_MAP)

    def test_intent_detection(self):
        # Sleep
        intents = detect_tool_intents("Why am I always tired in the morning?")
        self.assertTrue(any(t[0] == "get_sleep_analysis" for t in intents))

        # Spending
        intents = detect_tool_intents("Where did most of my money go this month?")
        self.assertTrue(any(t[0] == "get_spending_breakdown" for t in intents))

        # Productivity
        intents = detect_tool_intents("Analyze my deep work focus sessions")
        self.assertTrue(any(t[0] == "get_productivity_patterns" for t in intents))

        # Experiments
        intents = detect_tool_intents("How is my 7-day experiment challenge progressing?")
        self.assertTrue(any(t[0] == "get_active_experiments" for t in intents))

        # Anomalies
        intents = detect_tool_intents("Did you detect any weird anomalies this week?")
        self.assertTrue(any(t[0] == "get_anomalies_and_clusters" for t in intents))

        # Default fallback
        intents = detect_tool_intents("How is everything looking?")
        self.assertTrue(any(t[0] == "get_life_score_overview" for t in intents))


class TestDeterministicSynthesis(unittest.TestCase):
    def test_sleep_synthesis_narrative(self):
        tool_results = [
            {
                "tool": "get_sleep_analysis",
                "result": {
                    "days_analyzed": 14,
                    "avg_sleep_hours": 6.8,
                    "avg_sleep_quality_out_of_10": 7.2,
                    "bedtime_variance_minutes": 45,
                    "late_night_screen_sessions": 4,
                    "correlation_observation": "Higher screen time coincided with 0.5h lower sleep.",
                },
            }
        ]
        narrative = synthesize_deterministic_response("Why am I tired?", tool_results)
        self.assertIn("6.8 hours", narrative)
        self.assertIn("7.2/10", narrative)
        self.assertIn("±45 minutes", narrative)
        self.assertIn("4 late-night screen session", narrative)
        self.assertIn("Digital Sunset", narrative)

    def test_spending_synthesis_narrative(self):
        tool_results = [
            {
                "tool": "get_spending_breakdown",
                "result": {
                    "timeframe": "30 days",
                    "total_spend": 12450.0,
                    "discretionary_spend": 5600.0,
                    "non_discretionary_spend": 6850.0,
                    "discretionary_ratio_pct": 45.0,
                    "top_categories": [
                        {"category": "Dining Out", "amount": 3200.0, "pct": 25.7},
                        {"category": "Groceries", "amount": 4000.0, "pct": 32.1},
                    ],
                    "weekend_total": 4500.0,
                    "weekday_total": 7950.0,
                },
            }
        ]
        narrative = synthesize_deterministic_response("Where did my money go?", tool_results)
        self.assertIn("₹12,450.00", narrative)
        self.assertIn("45.0%", narrative)
        self.assertIn("Dining Out", narrative)

    def test_session_title_generator(self):
        self.assertEqual(generate_session_title("Why am I tired today?"), "Sleep & Energy Analysis")
        self.assertEqual(generate_session_title("Where did my money go?"), "Spending & Budget Breakdown")
        self.assertEqual(generate_session_title("Analyze my deep work"), "Deep Work & Focus Patterns")
        self.assertEqual(generate_session_title("How is my experiment going?"), "Behavioral Experiment Review")

    def test_starter_prompts_configured(self):
        self.assertGreaterEqual(len(STARTER_PROMPTS), 5)
        categories = [p.category for p in STARTER_PROMPTS]
        self.assertIn("Sleep & Energy", categories)
        self.assertIn("Finances", categories)
        self.assertIn("Experiments", categories)


if __name__ == "__main__":
    unittest.main()

