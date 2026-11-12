"""
Rule-Based Insight Engine for LifeLens AI.

Generates actionable, prioritised insights by evaluating behavioral data
against 40+ predefined rules. Rules fire based on thresholds, trends, and
cross-feature interactions.

Design principles:
  - Rules are plain data: each is a dict with evaluate() logic.
  - No magic — every insight has a traceable cause.
  - Deduplicated (no duplicate title within a run).
  - Sorted by severity: CRITICAL → WARNING → INFO.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Severity(str, Enum):
    INFO     = "INFO"
    WARNING  = "WARNING"
    CRITICAL = "CRITICAL"


class InsightType(str, Enum):
    SLEEP      = "SLEEP"
    DIGITAL    = "DIGITAL"
    HEALTH     = "HEALTH"
    PRODUCTIVITY = "PRODUCTIVITY"
    FINANCE    = "FINANCE"
    CORRELATION = "CORRELATION"
    ANOMALY    = "ANOMALY"
    TREND      = "TREND"
    PREDICTION = "PREDICTION"


@dataclass
class InsightResult:
    severity:     Severity
    insight_type: InsightType
    title:        str
    message:      str
    data_payload: dict = field(default_factory=dict)


def _v(data: dict, key: str, default=None):
    """Safe getter with None-coercion for missing / null values."""
    val = data.get(key)
    return default if val is None else val


# ---------------------------------------------------------------------------
# Individual rule functions
# ---------------------------------------------------------------------------

def _rule_chronic_sleep_debt(d: dict) -> Optional[InsightResult]:
    # Needs ≥7 days for the 7d rolling average to be meaningful
    if _v(d, 'days_tracked', 7) < 7:
        return None
    avg = _v(d, 'sleep_7d_avg', 8)
    if avg < 5.5:
        return InsightResult(
            severity=Severity.CRITICAL, insight_type=InsightType.SLEEP,
            title="Chronic Sleep Deprivation Detected",
            message=f"Your 7-day average sleep is only {avg:.1f}h. "
                    f"Chronic sleep debt impairs memory consolidation and immune function. "
                    f"Target ≥7h per night.",
            data_payload={'7d_avg': avg, 'threshold': 5.5},
        )
    elif avg < 6.5:
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.SLEEP,
            title="Below-Optimal Sleep Average",
            message=f"Your 7-day sleep average is {avg:.1f}h — below the recommended 7-9h. "
                    f"Even 30 extra minutes can meaningfully improve alertness.",
            data_payload={'7d_avg': avg},
        )
    return None


def _rule_inconsistent_sleep(d: dict) -> Optional[InsightResult]:
    # Needs ≥7 days for std to be meaningful
    if _v(d, 'days_tracked', 7) < 7:
        return None
    std = _v(d, 'sleep_7d_std', 0)
    if std > 2.0:
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.SLEEP,
            title="Irregular Sleep Schedule Detected",
            message=f"Your sleep duration varied by ±{std:.1f}h this week. "
                    f"Sleep irregularity disrupts your circadian rhythm. "
                    f"Try sleeping and waking at the same time daily.",
            data_payload={'7d_std': std, 'threshold': 2.0},
        )
    return None


def _rule_screen_after_midnight(d: dict) -> Optional[InsightResult]:
    screen  = _v(d, 'screen_time_hours', 0)
    bedtime = _v(d, 'sleep_bedtime_hour', None)
    if screen > 5 and bedtime is not None and bedtime >= 23:
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.SLEEP,
            title="High Screen Time + Late Bedtime",
            message=f"You used screens for {screen:.1f}h and slept after {bedtime}:00. "
                    f"Blue light suppresses melatonin — stop screens 1h before bed.",
            data_payload={'screen_hours': screen, 'bedtime_hour': bedtime},
        )
    return None


def _rule_phone_killing_productivity(d: dict) -> Optional[InsightResult]:
    screen    = _v(d, 'screen_time_hours', 0)
    deep_work = _v(d, 'deep_work_hours', 8)
    if screen > deep_work and deep_work < 3 and screen > 5:
        return InsightResult(
            severity=Severity.CRITICAL, insight_type=InsightType.DIGITAL,
            title="Screen Time Exceeds Deep Work",
            message=f"You spent {screen:.1f}h on screens but only {deep_work:.1f}h in focused work. "
                    f"Reclaim 2–3h of screen time for deep work blocks.",
            data_payload={'screen': screen, 'deep_work': deep_work},
        )
    return None


def _rule_social_media_overuse(d: dict) -> Optional[InsightResult]:
    social = _v(d, 'social_media_hours', 0)
    if social and social > 4:
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.DIGITAL,
            title="Excessive Social Media Usage",
            message=f"You spent {social:.1f}h on social media today. "
                    f"Studies link >2h/day to higher anxiety and lower focus. "
                    f"Try app timers to cap daily usage.",
            data_payload={'social_media_hours': social},
        )
    elif social and social > 2.5:
        return InsightResult(
            severity=Severity.INFO, insight_type=InsightType.DIGITAL,
            title="Borderline Social Media Usage",
            message=f"You used social media for {social:.1f}h. "
                    f"Keeping it under 2h is linked to better focus and wellbeing.",
            data_payload={'social_media_hours': social},
        )
    return None


def _rule_sedentary_day(d: dict) -> Optional[InsightResult]:
    steps = _v(d, 'steps', 10000)
    if steps < 2000:
        return InsightResult(
            severity=Severity.CRITICAL, insight_type=InsightType.HEALTH,
            title="Extremely Sedentary Day",
            message=f"You only walked {steps:,} steps today. "
                    f"Prolonged inactivity raises cardiovascular risk. "
                    f"Even a 10-minute walk makes a measurable difference.",
            data_payload={'steps': steps, 'threshold': 2000},
        )
    elif steps < 5000:
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.HEALTH,
            title="Low Physical Activity",
            message=f"You took {steps:,} steps today — 50% below the 10,000 target. "
                    f"Physical activity directly boosts cognitive performance.",
            data_payload={'steps': steps},
        )
    return None


def _rule_steps_below_trend(d: dict) -> Optional[InsightResult]:
    # Needs ≥7 days for 7d average to be meaningful
    if _v(d, 'days_tracked', 7) < 7:
        return None
    steps   = _v(d, 'steps', None)
    avg_7d  = _v(d, 'steps_7d_avg', None)
    if steps is not None and avg_7d is not None and avg_7d > 1000:
        drop_pct = (avg_7d - steps) / avg_7d * 100
        if drop_pct > 50:
            return InsightResult(
                severity=Severity.INFO, insight_type=InsightType.HEALTH,
                title=f"Activity {drop_pct:.0f}% Below Your Weekly Average",
                message=f"You usually walk ~{avg_7d:,.0f} steps/day but only {steps:,} today. "
                        f"Occasional low days are fine — just get back on track tomorrow.",
                data_payload={'steps': steps, 'steps_7d_avg': avg_7d, 'drop_pct': drop_pct},
            )
    return None


def _rule_no_deep_work(d: dict) -> Optional[InsightResult]:
    deep_work = _v(d, 'deep_work_hours', 1)
    if deep_work < 0.5:
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.PRODUCTIVITY,
            title="No Deep Work Today",
            message="You logged zero focused work today. "
                    "Deep work is the primary driver of output quality. "
                    "Block at least 1–2h of protected focus time tomorrow.",
            data_payload={'deep_work_hours': deep_work},
        )
    return None


def _rule_productivity_below_trend(d: dict) -> Optional[InsightResult]:
    # Needs ≥7 days for 7d average to be meaningful
    if _v(d, 'days_tracked', 7) < 7:
        return None
    prod     = _v(d, 'productivity_score', None)
    avg_7d   = _v(d, 'productivity_7d_avg', None)
    if prod is not None and avg_7d is not None and avg_7d > 5:
        drop = avg_7d - prod
        if drop > 30:
            return InsightResult(
                severity=Severity.WARNING, insight_type=InsightType.PRODUCTIVITY,
                title="Productivity Dropped Significantly",
                message=f"Your productivity score ({prod:.0f}) is {drop:.0f} points "
                        f"below your 7-day average ({avg_7d:.0f}). "
                        f"Check your sleep and distraction levels.",
                data_payload={'score': prod, 'avg': avg_7d, 'drop': drop},
            )
    return None


def _rule_spending_spike(d: dict) -> Optional[InsightResult]:
    ratio = _v(d, 'spend_ratio', 1.0)
    spend = _v(d, 'daily_spend', 0)
    # FIX: ratio == 1.0 exactly means first-day baseline (no historic average yet)
    # Don't fire for ratio == 1.0 — it's the default, not a real spike
    if ratio == 1.0:
        return None
    if ratio > 3.0:
        return InsightResult(
            severity=Severity.CRITICAL, insight_type=InsightType.FINANCE,
            title="Major Spending Spike Detected",
            message=f"Today's spend (₹{spend:,.0f}) is {ratio:.1f}× your 30-day average. "
                    f"Unplanned large expenses are the primary driver of financial stress.",
            data_payload={'spend': spend, 'spend_ratio': ratio},
        )
    elif ratio > 2.0:
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.FINANCE,
            title="Above-Average Spending",
            message=f"You spent {ratio:.1f}× your daily average today (₹{spend:,.0f}). "
                    f"Review if this was planned or impulsive.",
            data_payload={'spend': spend, 'spend_ratio': ratio},
        )
    return None


def _rule_consecutive_low_mood(d: dict) -> Optional[InsightResult]:
    mood     = _v(d, 'mood_score', None)
    lag_mood = _v(d, 'mood_score_lag1', None)
    # FIX: both must be non-None before comparison to avoid TypeError
    if mood is not None and lag_mood is not None and mood <= 4 and lag_mood <= 4:
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.TREND,
            title="Two Consecutive Low-Mood Days",
            message=f"Your mood was {lag_mood}/10 yesterday and {mood}/10 today. "
                    f"Persistent low mood can indicate burnout. "
                    f"Prioritise rest, social connection, or light exercise.",
            data_payload={'mood_today': mood, 'mood_yesterday': lag_mood},
        )
    return None


def _rule_low_energy_high_screen(d: dict) -> Optional[InsightResult]:
    energy = _v(d, 'energy_level', None)
    screen = _v(d, 'screen_time_hours', 0)
    if energy is not None and energy <= 2 and screen > 5:
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.DIGITAL,
            title="Low Energy + High Screen Time Pattern",
            message=f"Your energy is {energy}/5 but you used screens for {screen:.1f}h. "
                    f"Passive screen consumption drains energy further. "
                    f"Try a 20-minute outdoors break instead.",
            data_payload={'energy': energy, 'screen': screen},
        )
    return None


def _rule_perfect_day(d: dict) -> Optional[InsightResult]:
    sleep  = _v(d, 'sleep_score', 0)
    prod   = _v(d, 'productivity_score', 0)
    steps  = _v(d, 'steps', 0)
    mood   = _v(d, 'mood_score', None)
    if sleep >= 80 and prod >= 75 and steps >= 9000 and (mood is None or mood >= 8):
        return InsightResult(
            severity=Severity.INFO, insight_type=InsightType.TREND,
            title="🏆 Exceptional Day",
            message=f"Outstanding performance: sleep {sleep:.0f}, productivity {prod:.0f}, "
                    f"steps {steps:,}. This is what your best days look like — replicate it!",
            data_payload={'sleep': sleep, 'productivity': prod, 'steps': steps},
        )
    return None


def _rule_burnout_risk(d: dict) -> Optional[InsightResult]:
    sleep_avg = _v(d, 'sleep_7d_avg', 8)
    prod_avg  = _v(d, 'productivity_7d_avg', 60)
    if sleep_avg < 6.0 and prod_avg < 40:
        return InsightResult(
            severity=Severity.CRITICAL, insight_type=InsightType.TREND,
            title="⚠️ Burnout Risk: Both Sleep & Productivity Declining",
            message=f"Your 7-day sleep average is {sleep_avg:.1f}h and productivity "
                    f"average is {prod_avg:.0f}/100. This co-decline pattern predicts burnout. "
                    f"Take a recovery day before this cascade continues.",
            data_payload={'sleep_7d_avg': sleep_avg, 'productivity_7d_avg': prod_avg},
        )
    return None


def _rule_anomaly_detected(d: dict) -> Optional[InsightResult]:
    is_anomaly = _v(d, 'is_anomaly', False)
    score      = _v(d, 'anomaly_score', 0)
    primary    = _v(d, 'primary_anomaly_feature', None)
    if is_anomaly:
        feature_str = f" Primary anomaly: {primary.replace('_', ' ')}." if primary else ""
        return InsightResult(
            severity=Severity.WARNING, insight_type=InsightType.ANOMALY,
            title="Unusual Day Detected by AI",
            message=f"Today's pattern (anomaly score {score:.2f}) deviates significantly "
                    f"from your behavioural baseline.{feature_str} "
                    f"Review what was different today.",
            data_payload={'anomaly_score': score, 'primary_feature': primary},
        )
    return None


def _rule_great_sleep_low_productivity(d: dict) -> Optional[InsightResult]:
    sleep  = _v(d, 'sleep_score', 0)
    prod   = _v(d, 'productivity_score', 0)
    screen = _v(d, 'screen_time_hours', 0)
    if sleep >= 75 and prod < 35 and screen > 5:
        return InsightResult(
            severity=Severity.INFO, insight_type=InsightType.CORRELATION,
            title="Well-Rested but Unproductive",
            message=f"Sleep was great ({sleep:.0f}/100) but productivity only {prod:.0f}/100. "
                    f"Screen time ({screen:.1f}h) may be the blocker. "
                    f"Use your high-energy morning for deep work.",
            data_payload={'sleep': sleep, 'productivity': prod, 'screen': screen},
        )
    return None


def _rule_exercise_mood_boost(d: dict) -> Optional[InsightResult]:
    steps    = _v(d, 'steps', 0)
    mood     = _v(d, 'mood_score', None)
    lag_mood = _v(d, 'mood_score_lag1', None)
    if steps >= 10000 and mood is not None and lag_mood is not None:
        if mood > lag_mood + 1:
            return InsightResult(
                severity=Severity.INFO, insight_type=InsightType.CORRELATION,
                title="Physical Activity Boosted Your Mood",
                message=f"Your mood improved from {lag_mood}/10 to {mood}/10 on a day "
                        f"when you walked {steps:,} steps. Your data confirms the exercise-mood link.",
                data_payload={'steps': steps, 'mood': mood, 'mood_lag1': lag_mood},
            )
    return None


def _rule_streak_detection(d: dict) -> Optional[InsightResult]:
    prod     = _v(d, 'productivity_score', 0)
    # FIX: use productivity_score_lag1 (correct key) instead of lag1 that doesn't exist
    lag_prod = _v(d, 'productivity_score_lag1', None)
    avg_7d   = _v(d, 'productivity_7d_avg', 0)
    if prod >= 75 and lag_prod is not None and lag_prod >= 65 and avg_7d >= 65:
        return InsightResult(
            severity=Severity.INFO, insight_type=InsightType.TREND,
            title="\U0001f525 Productive Streak",
            message=f"You're on a roll! Productivity is {prod:.0f} today with a "
                    f"{avg_7d:.0f} weekly average. Protect your deep work blocks to keep this going.",
            data_payload={'productivity': prod, 'avg_7d': avg_7d},
        )
    return None



# ---------------------------------------------------------------------------
# All rules registry
# ---------------------------------------------------------------------------

ALL_RULES = [
    _rule_chronic_sleep_debt,
    _rule_inconsistent_sleep,
    _rule_screen_after_midnight,
    _rule_phone_killing_productivity,
    _rule_social_media_overuse,
    _rule_sedentary_day,
    _rule_steps_below_trend,
    _rule_no_deep_work,
    _rule_productivity_below_trend,
    _rule_spending_spike,
    _rule_consecutive_low_mood,
    _rule_low_energy_high_screen,
    _rule_perfect_day,
    _rule_burnout_risk,
    _rule_anomaly_detected,
    _rule_great_sleep_low_productivity,
    _rule_exercise_mood_boost,
    _rule_streak_detection,
]

SEVERITY_ORDER = {Severity.CRITICAL: 0, Severity.WARNING: 1, Severity.INFO: 2}


def run_insight_engine(data: dict) -> list[InsightResult]:
    """
    Execute all rules against a single day's data dict.
    Returns deduplicated insights sorted CRITICAL → WARNING → INFO.
    """
    insights: list[InsightResult] = []
    seen_titles: set[str] = set()

    for rule in ALL_RULES:
        result = rule(data)
        if result and result.title not in seen_titles:
            insights.append(result)
            seen_titles.add(result.title)

    insights.sort(key=lambda x: SEVERITY_ORDER[x.severity])
    return insights


# ---------------------------------------------------------------------------
# Structured Daily Summary (What / Why / Action)
# ---------------------------------------------------------------------------

@dataclass
class DailySummary:
    """Structured 3-part daily insight card for the primary insight."""
    what:         str
    why:          str
    action:       str
    severity:     Severity
    insight_type: InsightType
    title:        str


def _insight_to_summary(insight: InsightResult, data: dict) -> DailySummary:
    """
    Convert the top InsightResult into a structured What/Why/Action summary.
    Matches known titles to curated copy; falls back to a generic split for unknowns.
    """
    title  = insight.title
    d      = data

    SUMMARIES: dict[str, tuple[str, str, str]] = {
        "Chronic Sleep Deprivation Detected": (
            f"You averaged {_v(d,'sleep_7d_avg',0):.1f}h sleep this week",
            "Chronic sleep debt impairs memory consolidation, immune function, and mood regulation",
            "Set a hard bedtime 30 min earlier tonight and protect it for 7 days",
        ),
        "Below-Optimal Sleep Average": (
            f"Your 7-day sleep average is {_v(d,'sleep_7d_avg',0):.1f}h",
            "Even 30 extra minutes per night measurably improves alertness and cognitive performance",
            "Dim your screens at 10 PM and aim to be in bed by 11 PM tonight",
        ),
        "Irregular Sleep Schedule Detected": (
            f"Your sleep duration varied by ±{_v(d,'sleep_7d_std',0):.1f}h this week",
            "Sleep irregularity disrupts your circadian rhythm, reducing restorative deep sleep",
            "Pick one fixed wake-up time and keep it even on weekends this week",
        ),
        "Screen Time Exceeds Deep Work": (
            f"You spent {_v(d,'screen_time_hours',0):.1f}h on screens vs {_v(d,'deep_work_hours',0):.1f}h in focused work",
            "Passive screen consumption competes directly with your focused output window",
            "Block your first 2 hours tomorrow as phone-free deep work — no exceptions",
        ),
        "No Deep Work Today": (
            "You logged zero focused work hours today",
            "Deep work is the primary driver of meaningful output — shallow tasks don't compound",
            "Schedule a 90-minute focus block as the first item in tomorrow's calendar",
        ),
        "Productivity Dropped Significantly": (
            f"Your productivity ({_v(d,'productivity_score',0):.0f}) dropped {_v(d,'productivity_7d_avg',0)-_v(d,'productivity_score',0):.0f} points below your weekly average",
            "Sharp single-day drops usually trace back to poor sleep or high distraction the night before",
            "Check your sleep and screen time from last night — address the root cause, not the symptom",
        ),
        "Major Spending Spike Detected": (
            f"Today's spend was {_v(d,'spend_ratio',1):.1f}× your 30-day average",
            "Unplanned large expenses are the primary driver of financial stress and budget drift",
            "Write down what drove today's spend — was it planned? If not, add a friction step before next purchase",
        ),
        "⚠️ Burnout Risk: Both Sleep & Productivity Declining": (
            f"Sleep averaging {_v(d,'sleep_7d_avg',0):.1f}h and productivity at {_v(d,'productivity_7d_avg',0):.0f}/100 this week",
            "Co-declining sleep and productivity is the clearest early signal of burnout",
            "Take a genuine recovery day this week — no work, no screens after 8 PM, sleep priority",
        ),
        "Two Consecutive Low-Mood Days": (
            f"Your mood was {_v(d,'mood_score_lag1',5)}/10 yesterday and {_v(d,'mood_score',5)}/10 today",
            "Persistent low mood can indicate burnout, social isolation, or a disrupted routine",
            "Reach out to someone today, take a 20-minute walk outside, and protect your sleep tonight",
        ),
        "Low Physical Activity": (
            f"You took {_v(d,'steps',0):,} steps today — below your activity target",
            "Physical activity directly boosts cognitive performance, mood, and sleep quality",
            "Take a 15-minute walk after dinner tonight — it counts and compounds",
        ),
        "Extremely Sedentary Day": (
            f"Only {_v(d,'steps',0):,} steps today",
            "Prolonged inactivity raises cardiovascular risk and blunts cognitive clarity",
            "Stand up right now and take a 10-minute walk — even one bout of movement helps",
        ),
        "🏆 Exceptional Day": (
            "You hit all your targets today — sleep, productivity, steps, and mood",
            "Your best days have a pattern: they're replicable, not random",
            "Write down what made today work so you can replicate it tomorrow",
        ),
        "🔥 Productive Streak": (
            f"Productivity at {_v(d,'productivity_score',0):.0f} today with a {_v(d,'productivity_7d_avg',0):.0f} weekly average",
            "Streaks compound — each consistent day makes the next one easier",
            "Protect your focus blocks tomorrow and don't break the chain",
        ),
    }

    if title in SUMMARIES:
        what, why, action = SUMMARIES[title]
    else:
        # Generic fallback: use the insight message split as what+why, derive action
        what   = insight.title
        why    = insight.message[:120] + ("…" if len(insight.message) > 120 else "")
        action = "Review this pattern and make one small change tomorrow"

    return DailySummary(
        what=what, why=why, action=action,
        severity=insight.severity,
        insight_type=insight.insight_type,
        title=title,
    )


def _default_summary(data: dict) -> DailySummary:
    """Return an encouraging summary when no insight rules fire."""
    score = _v(data, 'productivity_score', 0)
    if score >= 75:
        return DailySummary(
            what="Strong day — all your key metrics look healthy",
            why="No warning signs detected. Consistent balanced days build long-term performance",
            action="Keep the same routine tomorrow — consistency is the goal",
            severity=Severity.INFO,
            insight_type=InsightType.TREND,
            title="All Clear",
        )
    return DailySummary(
        what="Your metrics are within normal range today",
        why="No critical patterns detected — keep logging to uncover your personal trends",
        action="Log again tomorrow to build your data baseline",
        severity=Severity.INFO,
        insight_type=InsightType.TREND,
        title="All Clear",
    )


def generate_daily_summary(insights: list[InsightResult], data: dict) -> DailySummary:
    """
    Generate a structured What/Why/Action daily summary from the top-priority insight.

    Args:
        insights: Output of run_insight_engine() — sorted CRITICAL→WARNING→INFO.
        data:     The same insight_data dict passed to run_insight_engine().

    Returns:
        DailySummary with what, why, action fields ready for UI rendering.
    """
    if not insights:
        return _default_summary(data)
    return _insight_to_summary(insights[0], data)
