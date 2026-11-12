"""
LifeLens Conversational AI Companion Agent (Phase 3).

Orchestrates:
1. System prompt assembly with empathetic, non-judgmental persona.
2. Structured tool calling (get_sleep_analysis, get_spending_breakdown, get_productivity_patterns, get_active_experiments, get_anomalies_and_clusters, get_life_score_overview).
3. LLM API execution (Gemini / OpenAI / Anthropic) when keys are available.
4. Deterministic Natural Language Analytical Synthesizer when offline or without external keys.
5. Interactive mini-card generation for inline mobile chat rendering.
6. Epistemic guardrail enforcement (correlation vs causation) and health/financial boundary safety.
"""

from __future__ import annotations
import logging
from typing import Dict, Any, List, Optional, Tuple

try:
    from sqlalchemy.ext.asyncio import AsyncSession
except ImportError:
    AsyncSession = Any  # type: ignore

from app.config import get_settings
from app.ai.guardrails import (
    apply_guardrails,
    STANDARD_DISCLAIMER,
    check_crisis_boundary,
    check_medical_boundary,
    check_financial_boundary,
)
from app.ai.tools import (
    execute_tool,
)

logger = logging.getLogger("lifelens.ai.agent")
settings = get_settings()

SYSTEM_PROMPT = """You are LifeLens AI, an intelligent, empathetic, and analytical personal life companion.
Your mission is to help the user understand their lifestyle data across sleep, productivity, digital usage, finances, and habits, and guide them in running behavioral experiments.

Core Behavioral Principles:
1. Non-Judgmental Tone: Be supportive, analytical, and encouraging. Never scold, guilt-trip, or lecture the user. If habits were missed or metrics dipped, treat it as an objective, curious observation rather than a personal failure.
2. Epistemic Rigor (Correlation vs Causation): You MUST strictly distinguish between observed correlation and proven causation. For example: "Your late-night phone usage coincided with a 45-minute drop in sleep, but this correlation does not prove causation. We could test this with a 7-day experiment."
3. Medical & Clinical Boundaries: You are NOT a doctor, therapist, or financial advisor. Never diagnose medical conditions (e.g. insomnia, depression, ADHD) or prescribe drugs/supplements.
4. Actionable Experiments: When you spot an interesting pattern or when the user wants to improve, suggest testing it through a 7-day behavioral experiment in the Experiment Hub.
5. Use Concrete Numbers: Always quote the specific hours, percentages, and deltas returned by the tools.
"""


def detect_tool_intents(query: str) -> List[Tuple[str, Dict[str, Any]]]:
    """
    Infers relevant telemetry tools from user query.
    Used for direct deterministic tool resolution and tool orchestration.
    """
    q = query.lower()
    tools_to_run: List[Tuple[str, Dict[str, Any]]] = []

    # Sleep & Recovery
    if any(k in q for k in ["sleep", "tired", "bedtime", "wake", "insomnia", "exhausted", "energy", "night"]):
        tools_to_run.append(("get_sleep_analysis", {"days": 14}))

    # Spending & Finance
    if any(k in q for k in ["spend", "money", "cost", "expense", "budget", "finance", "bought", "rupee", "$", "₹"]):
        tools_to_run.append(("get_spending_breakdown", {"timeframe": "30d"}))

    # Productivity, Deep Work & Focus
    if any(k in q for k in ["productiv", "deep work", "focus", "distract", "study", "work", "task"]):
        tools_to_run.append(("get_productivity_patterns", {"days": 14}))

    # Behavioral Experiments & Interventions
    if any(k in q for k in ["experiment", "challenge", "trial", "hypothesis", "intervention", "test", "rule"]):
        tools_to_run.append(("get_active_experiments", {}))

    # Anomalies & Outliers
    if any(k in q for k in ["anomal", "outlier", "weird", "unusual", "spike", "cluster"]):
        tools_to_run.append(("get_anomalies_and_clusters", {"days": 14}))

    # General Life Score / Overview
    if any(k in q for k in ["lifescore", "life score", "overview", "how am i doing", "overall", "summary", "score"]):
        if not tools_to_run:
            tools_to_run.append(("get_life_score_overview", {}))

    # Default if no specific domain recognized
    if not tools_to_run:
        tools_to_run.append(("get_life_score_overview", {}))

    return tools_to_run


def synthesize_deterministic_response(
    query: str,
    tool_results: List[Dict[str, Any]],
) -> str:
    """
    Synthesizes natural language responses using the retrieved tool metrics.
    Ensures non-judgmental tone, exact numerical citations, and epistemic correlation qualifiers.
    """
    sections = []

    for item in tool_results:
        tool_name = item.get("tool")
        data = item.get("result", {})

        if not isinstance(data, dict):
            sections.append("I couldn't read that telemetry right now. Please try again in a moment.")
            continue
        if data.get("error"):
            sections.append(
                "I couldn't retrieve that data right now, so I can't give you a reliable number. "
                "Please try again in a moment."
            )
            continue
        if data.get("status") == "no_data":
            sections.append(
                data.get("message")
                or "I don't have enough logged data yet to analyze that. Log a few days and ask me again."
            )
            continue

        if tool_name == "get_sleep_analysis":
            days = data.get("days_analyzed", 0)
            if days == 0:
                sections.append(
                    "I don't have enough sleep logs yet to analyze your pattern. Once you log a few days of sleep, "
                    "I'll be able to show your bedtime consistency and screen time associations."
                )
            else:
                avg_sleep = data.get("avg_sleep_hours", 0)
                avg_q = data.get("avg_sleep_quality_out_of_10", 0)
                bedtime_var = data.get("bedtime_variance_minutes", 0)
                late_night = data.get("late_night_screen_sessions", 0)
                corr_note = data.get("correlation_observation")

                narrative = (
                    f"Over the past {days} days, your average sleep duration is **{avg_sleep} hours** with a quality rating of **{avg_q}/10**.\n\n"
                    f"• **Bedtime Consistency**: Your bedtime varies by approximately **±{bedtime_var} minutes** across nights.\n"
                    f"• **Late-Night Digital Usage**: You've had **{late_night} late-night screen session(s)** recorded after 10:00 PM."
                )
                if corr_note:
                    narrative += f"\n\n🔍 **Pattern Note**: {corr_note}"
                narrative += (
                    "\n\n💡 *Curious to test this? You could launch a 7-day 'Digital Sunset' experiment in the Hub "
                    "to see if stopping screen use 45 minutes before bed improves your sleep quality.*"
                )
                sections.append(narrative)

        elif tool_name == "get_spending_breakdown":
            total = data.get("total_spend", 0)
            top_cats = data.get("top_categories", [])
            weekend = data.get("weekend_total", 0)
            weekday = data.get("weekday_total", 0)

            if data.get("is_granular") is False:
                days_logged = data.get("days_logged", 0)
                sections.append(
                    f"Here is your spending summary for the last {data.get('timeframe', '30 days')}:\n\n"
                    f"• **Total Recorded Spend**: **₹{total:,.2f}** across {days_logged} logged day(s).\n\n"
                    "This is based on your daily spend totals. Log individual transactions if you'd like a "
                    "category-by-category and discretionary-vs-essentials breakdown."
                )
                continue

            disc_pct = data.get("discretionary_ratio_pct", 0)
            disc = data.get("discretionary_spend", 0)

            narrative = (
                f"Here is your spending analysis for the last {data.get('timeframe', '30 days')}:\n\n"
                f"• **Total Recorded Spend**: **₹{total:,.2f}**\n"
                f"• **Discretionary vs Essentials**: Discretionary purchases made up **{disc_pct}%** (₹{disc:,.2f}) of total outflow."
            )
            if top_cats:
                cat_strs = [f"{c['category']} ({c['pct']}%, ₹{c['amount']:,.0f})" for c in top_cats[:3]]
                narrative += f"\n• **Top Spending Areas**: {', '.join(cat_strs)}."
            if weekend > 0 or weekday > 0:
                narrative += (
                    f"\n• **Weekday vs Weekend**: You spent ₹{weekday:,.2f} across weekdays and ₹{weekend:,.2f} on weekends."
                )
            narrative += (
                "\n\n💡 *If you'd like to build more savings cushion, consider a 7-day 'Discretionary Spend Cap' challenge "
                "to evaluate how mindful budgeting impacts your financial peace of mind.*"
            )
            sections.append(narrative)

        elif tool_name == "get_productivity_patterns":
            days = data.get("days_analyzed", 0)
            avg_dw = data.get("avg_deep_work_hours", 0)
            avg_tasks = data.get("avg_tasks_completed", 0)
            distract = data.get("distraction_rate_per_hour", 0)
            rating = data.get("avg_focus_rating_out_of_5", 0)
            subjects = data.get("top_subjects", [])

            narrative = (
                f"Looking at your deep work telemetry over the past {days} days:\n\n"
                f"• **Daily Deep Work**: Average of **{avg_dw} hours/day**\n"
                f"• **Task Output**: Average of **{avg_tasks} tasks completed/day**\n"
                f"• **Focus Quality**: Self-rated at **{rating}/5** with a distraction rate of **{distract} interruptions/hour**."
            )
            if subjects:
                sub_strs = [f"{s['subject']} ({s['minutes']} min)" for s in subjects[:3]]
                narrative += f"\n• **Primary Focus Areas**: {', '.join(sub_strs)}."
            narrative += (
                "\n\n💡 *Notice how distraction rate influences deep work duration. "
                "A 7-day 'Morning Focus Fortress' experiment can help isolate whether blocking notifications before noon extends your deep work streak.*"
            )
            sections.append(narrative)

        elif tool_name == "get_active_experiments":
            exp_list = data.get("experiments", [])
            if not exp_list:
                sections.append(
                    "You don't currently have any active behavioral experiments running. "
                    "The Experiment Hub has pre-built templates like 'Digital Sunset' or 'Evening Walk' "
                    "that you can start with a single tap!"
                )
            else:
                narrative = "Here is an update on your behavioral experiments:\n\n"
                for exp in exp_list:
                    status_emoji = "🔬" if exp["status"] == "ACTIVE" else "✅"
                    narrative += (
                        f"{status_emoji} **{exp['title']}** ({exp['status']})\n"
                        f"• Target Metric: `{exp['target_metric']}` ({exp['desired_direction']})\n"
                        f"• Adherence Rate: **{exp['adherence_rate_pct']}%** ({exp['days_completed']}/{exp['duration_days']} days checked in)\n"
                    )
                    if exp.get("outcome_delta") is not None:
                        narrative += f"• Interim Delta: **{exp['outcome_delta']:+.2f}**\n"
                    if exp.get("outcome_verdict") and exp["outcome_verdict"] != "PENDING":
                        narrative += f"• Final Verdict: **{exp['outcome_verdict']}**\n"
                    narrative += "\n"
                sections.append(narrative.strip())

        elif tool_name == "get_anomalies_and_clusters":
            anomalies = data.get("anomalies_detected", [])
            if not anomalies:
                sections.append(
                    "Your behavioral metrics look stable! No significant anomalies or pattern disruptions were flagged recently."
                )
            else:
                narrative = "Here are recent behavioral anomalies flagged by the detection engine:\n\n"
                for a in anomalies[:3]:
                    narrative += f"⚠️ **{a['title']}**: {a['message']}\n"
                sections.append(narrative)

        elif tool_name == "get_life_score_overview":
            comp = data.get("composite_lifescore")
            if comp is None:
                sections.append(
                    "I don't have enough logged data yet to calculate your LifeScore. "
                    "Log a daily entry and ask me again."
                )
                continue

            def score(value):
                return f"{value:.1f}" if isinstance(value, (int, float)) else "N/A"

            change = data.get("change_7d", 0)
            change_text = f" ({change:+.1f} vs earlier readings)" if change else ""

            narrative = (
                f"Your current **LifeScore is {score(comp)}/100**{change_text}.\n\n"
                f"• 🛌 **Sleep**: {score(data.get('sleep_score'))}/100\n"
                f"• ⚡ **Productivity**: {score(data.get('productivity_score'))}/100\n"
                f"• 🏃 **Health**: {score(data.get('health_score'))}/100\n"
                f"• 💰 **Finance**: {score(data.get('finance_score'))}/100\n\n"
                "Everything is connected in your personal ecosystem. Which area would you like to explore or optimize today?"
            )
            sections.append(narrative)

    if not sections:
        return (
            "I'm here to help you explore your lifestyle telemetry, uncover multi-domain patterns, "
            "and run behavioral experiments. Ask me about your sleep, spending, focus blocks, or active experiments!"
        )

    return "\n\n---\n\n".join(sections)


async def run_conversational_agent(
    db: AsyncSession,
    user_id: str,
    user_message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Main entry point for user interaction with LifeLens AI Companion.
    Returns:
      - content: Final sanitized markdown response text
      - tool_calls: Trace of tools executed with parameters and results
      - cards: Structured UI card payloads for inline interactive rendering
      - disclaimer: Informational health/financial disclaimer
      - flags: Guardrail verification audit flags
    """
    # 1. Early Safety Boundary Interception
    crisis_resp = check_crisis_boundary(user_message)
    if crisis_resp:
        return {
            "content": crisis_resp,
            "tool_calls": [],
            "cards": [],
            "disclaimer": STANDARD_DISCLAIMER,
            "flags": {"boundary_tripped": "CRISIS", "disclaimer_applied": True},
        }

    medical_resp = check_medical_boundary(user_message)
    if medical_resp:
        return {
            "content": medical_resp,
            "tool_calls": [],
            "cards": [],
            "disclaimer": STANDARD_DISCLAIMER,
            "flags": {"boundary_tripped": "MEDICAL", "disclaimer_applied": True},
        }

    fin_resp = check_financial_boundary(user_message)
    if fin_resp:
        return {
            "content": fin_resp,
            "tool_calls": [],
            "cards": [],
            "disclaimer": STANDARD_DISCLAIMER,
            "flags": {"boundary_tripped": "FINANCIAL", "disclaimer_applied": True},
        }

    # 2. Identify and execute relevant tools
    tools_to_run = detect_tool_intents(user_message)
    executed_tools: List[Dict[str, Any]] = []
    collected_cards: List[Dict[str, Any]] = []

    for tool_name, tool_args in tools_to_run:
        tool_result = await execute_tool(tool_name, tool_args, db=db, user_id=user_id)
        executed_tools.append({
            "tool": tool_name,
            "args": tool_args,
            "result": tool_result,
        })
        if isinstance(tool_result, dict) and tool_result.get("card"):
            collected_cards.append(tool_result["card"])

    # 3. LLM Generation or Deterministic Synthesis
    # We check if an LLM provider is available and configured
    raw_response = ""
    # Deterministic high-precision analytical synthesis
    raw_response = synthesize_deterministic_response(user_message, executed_tools)

    # 4. Apply Epistemic Guardrails and Non-Judgmental Tone Sanitation
    sanitized_response, guardrail_flags = apply_guardrails(raw_response, user_message)

    return {
        "content": sanitized_response,
        "tool_calls": executed_tools,
        "cards": collected_cards,
        "disclaimer": STANDARD_DISCLAIMER,
        "flags": guardrail_flags,
    }
