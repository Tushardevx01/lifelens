"""
LifeLens Multi-Target Behavioral Risk Forecasting Engine (Phase 6.1).

Provides specialized predictive risk heads beyond basic productivity regression:
  1. Workout Skip Risk Classifier: Predicts probability of skipping exercise
     based on bedtime, sleep deficit, recovery score, and schedule inertia.
  2. Budget Overrun Forecaster: Predicts end-of-month spending based on
     current discretionary velocity, elapsed month fraction, and remaining days.
  3. Circadian Drift Detector: Tracks bedtime variance, shift magnitude,
     and alerts when sleep schedule drifts >90 minutes over consecutive nights.
"""

from __future__ import annotations
import math
from dataclasses import dataclass
from datetime import date, time
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class BudgetRiskStatus(str, Enum):
    ON_TRACK = "ON_TRACK"
    CAUTION = "CAUTION"
    OVERRUN_IMMINENT = "OVERRUN_IMMINENT"
    DEFICIT_EXCEEDED = "DEFICIT_EXCEEDED"


class CircadianStatus(str, Enum):
    STABLE = "STABLE"
    PHASE_DELAY = "PHASE_DELAY"          # Sleep creeping later into the night
    PHASE_ADVANCE = "PHASE_ADVANCE"      # Sleep shifting earlier
    IRREGULAR_SOCIAL_JETLAG = "IRREGULAR_SOCIAL_JETLAG"  # High weekend/weekday divergence


# ============================================================================
# Dataclasses
# ============================================================================

@dataclass
class WorkoutSkipForecast:
    probability: float                  # 0.0 to 1.0
    risk_level: RiskLevel               # LOW, MODERATE, HIGH, CRITICAL
    confidence: float                   # 0.0 to 1.0
    primary_driver: str
    contributing_factors: List[str]
    mitigation_strategy: str
    target_recommendation: str


@dataclass
class BudgetOverrunForecast:
    monthly_budget: float
    current_spend: float
    current_discretionary_spend: float
    discretionary_ratio_pct: float
    days_elapsed: int
    days_remaining: int
    current_daily_velocity: float
    projected_eom_spend: float
    projected_overrun: float            # Max(0, projected_eom_spend - monthly_budget)
    overrun_probability: float          # 0.0 to 1.0
    risk_status: BudgetRiskStatus
    recommended_daily_cap: float        # Spending ceiling per day to stay on budget
    top_discretionary_categories: List[Dict[str, Any]]
    actionable_advice: str


@dataclass
class CircadianDriftForecast:
    status: CircadianStatus
    alert_level: RiskLevel
    bedtime_variance_minutes: float
    max_shift_minutes: float
    consecutive_drift_days: int
    average_bedtime: str                # "HH:MM"
    average_wake_time: str              # "HH:MM"
    social_jetlag_minutes: float        # Difference between weekday and weekend bedtimes
    resynchronization_protocol: str


@dataclass
class CompositeRiskForecast:
    date: str
    workout_skip: WorkoutSkipForecast
    budget_overrun: BudgetOverrunForecast
    circadian_drift: CircadianDriftForecast
    overall_risk_score: float           # 0 to 100 composite index
    key_vulnerability_summary: str


# ============================================================================
# Helper Functions
# ============================================================================

def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        f = float(val)
        return default if math.isnan(f) or math.isinf(f) else f
    except (ValueError, TypeError):
        return default


def _time_to_minutes_from_midnight(t: Optional[time | str]) -> Optional[int]:
    """
    Converts a time or "HH:MM" string into signed minutes relative to midnight.
    Times between 18:00 and 23:59 are negative (-360 to -1).
    Times between 00:00 and 12:00 are positive (0 to 720).
    Allows smooth distance calculations across midnight.
    """
    if t is None:
        return None

    if isinstance(t, str):
        t_clean = t.strip()
        if not t_clean:
            return None
        try:
            parts = t_clean.split(":")
            h = int(parts[0])
            m = int(parts[1]) if len(parts) > 1 else 0
        except (ValueError, IndexError):
            return None
    elif isinstance(t, time):
        h = t.hour
        m = t.minute
    else:
        return None

    total_minutes = h * 60 + m
    if total_minutes >= 18 * 60:  # 18:00 - 23:59: evening before midnight
        return total_minutes - (24 * 60)
    return total_minutes  # 00:00 - 12:00: morning past midnight


def _minutes_to_time_str(mins_relative: float) -> str:
    """Converts relative minutes back to 24-hour HH:MM format."""
    total = int(round(mins_relative))
    if total < 0:
        total += 24 * 60
    total = total % (24 * 60)
    hours = total // 60
    minutes = total % 60
    return f"{hours:02d}:{minutes:02d}"


# ============================================================================
# 1. Workout Skip Risk Classifier
# ============================================================================

def calculate_workout_skip_risk(
    sleep_hours: float,
    sleep_quality: int,
    bedtime: Optional[time | str] = None,
    energy_level: Optional[int] = None,
    steps_yesterday: Optional[int] = None,
    consecutive_inactive_days: int = 0,
    scheduled_deep_work_hours: float = 0.0,
    historical_skip_rate: float = 0.25,
) -> WorkoutSkipForecast:
    """
    Predicts probability of skipping an intended workout today.
    
    Formula uses logistic-weighted behavioral heuristics grounded in
    circadian physiology, energy deficit, and behavioral inertia.
    """
    s_hours = _safe_float(sleep_hours, default=7.0)
    s_quality = max(1, min(5, int(_safe_float(sleep_quality, default=3))))
    energy = max(1, min(10, int(_safe_float(energy_level, default=6))))
    steps_y = _safe_float(steps_yesterday, default=7500)
    inactive_days = max(0, int(consecutive_inactive_days))
    deep_work = _safe_float(scheduled_deep_work_hours, default=0.0)

    # Base log-odds starting from baseline historical skip rate
    base_rate = max(0.05, min(0.95, historical_skip_rate))
    log_odds = math.log(base_rate / (1.0 - base_rate))

    contributing: List[str] = []

    # 1. Sleep deficit penalty
    if s_hours < 5.0:
        log_odds += 1.45
        contributing.append(f"Severe sleep deficit ({s_hours:.1f}h sleep)")
    elif s_hours < 6.5:
        log_odds += 0.85
        contributing.append(f"Sub-optimal sleep ({s_hours:.1f}h sleep)")
    elif s_hours >= 7.5:
        log_odds -= 0.60

    # 2. Sleep quality factor
    if s_quality <= 2:
        log_odds += 0.90
        contributing.append(f"Poor sleep quality rating ({s_quality}/5)")
    elif s_quality >= 4:
        log_odds -= 0.50

    # 3. Circadian bedtime delay (bedtime past midnight)
    bed_mins = _time_to_minutes_from_midnight(bedtime)
    if bed_mins is not None and bed_mins > 90:  # Past 01:30 AM
        log_odds += 0.75
        contributing.append(f"Circadian delay: late bedtime ({_minutes_to_time_str(bed_mins)})")

    # 4. Energy level depletion
    if energy <= 3:
        log_odds += 1.20
        contributing.append(f"Depleted energy level ({energy}/10)")
    elif energy <= 5:
        log_odds += 0.50
        contributing.append(f"Moderate morning fatigue ({energy}/10)")
    elif energy >= 8:
        log_odds -= 0.70

    # 5. Behavioral inertia (consecutive missed days raise barrier)
    if inactive_days >= 3:
        log_odds += 1.10
        contributing.append(f"Behavioral friction from {inactive_days} consecutive inactive days")
    elif inactive_days >= 2:
        log_odds += 0.55
        contributing.append(f"{inactive_days} consecutive inactive days")

    # 6. Physical overtraining exhaustion check (e.g. extreme steps yesterday)
    if steps_y > 18000:
        log_odds += 0.40
        contributing.append(f"Residual physical fatigue from {int(steps_y):,} steps yesterday")

    # 7. Cognitive drain competition
    if deep_work >= 6.0:
        log_odds += 0.50
        contributing.append(f"Heavy cognitive load scheduled ({deep_work:.1f}h focus)")

    # Sigmoid transform to [0.0, 1.0]
    prob = 1.0 / (1.0 + math.exp(-log_odds))
    prob = round(max(0.01, min(0.99, prob)), 3)

    # Determine risk level
    if prob >= 0.80:
        level = RiskLevel.CRITICAL
    elif prob >= 0.55:
        level = RiskLevel.HIGH
    elif prob >= 0.30:
        level = RiskLevel.MODERATE
    else:
        level = RiskLevel.LOW

    # Primary driver & mitigation recommendation
    if not contributing:
        primary_driver = "Optimal rest and consistent momentum"
        mitigation = "Stick to your scheduled workout time; your physical readiness is strong."
        target_rec = "Full planned training session (45-60 min)."
    else:
        primary_driver = contributing[0]
        if level in (RiskLevel.CRITICAL, RiskLevel.HIGH):
            mitigation = "Apply the '10-Minute Minimum' rule: start with 10 min of light mobility or a brisk walk. Give yourself permission to stop after 10 min if still exhausted."
            target_rec = "Low-intensity mobility or 20-min brisk outdoor walk."
        elif level == RiskLevel.MODERATE:
            mitigation = "Reduce session intensity by 20% rather than skipping completely. Momentum matters more than peak performance today."
            target_rec = "Moderate 30-min workout or steady-state cardio."
        else:
            mitigation = "Pre-commit to a specific workout time window before lunch."
            target_rec = "Standard planned workout session."

    confidence = round(min(0.95, 0.65 + (len(contributing) * 0.05)), 2)

    return WorkoutSkipForecast(
        probability=prob,
        risk_level=level,
        confidence=confidence,
        primary_driver=primary_driver,
        contributing_factors=contributing,
        mitigation_strategy=mitigation,
        target_recommendation=target_rec,
    )


# ============================================================================
# 2. Budget Overrun Forecaster
# ============================================================================

def forecast_budget_overrun(
    current_spend: float,
    current_discretionary_spend: float,
    monthly_budget: float,
    as_of_date: Optional[date] = None,
    discretionary_by_category: Optional[Dict[str, float]] = None,
) -> BudgetOverrunForecast:
    """
    Forecasts month-end total spend and overrun probability using
    elapsed day run-rates, discretionary velocity, and days remaining.
    """
    ref_date = as_of_date or date.today()
    c_spend = max(0.0, _safe_float(current_spend))
    c_disc = max(0.0, _safe_float(current_discretionary_spend))
    m_budget = max(1.0, _safe_float(monthly_budget, default=30000.0))

    # Calculate days in month
    year = ref_date.year
    month = ref_date.month
    if month == 12:
        next_month_first = date(year + 1, 1, 1)
    else:
        next_month_first = date(year, month + 1, 1)
    days_in_month = (next_month_first - date(year, month, 1)).days

    days_elapsed = max(1, min(days_in_month, ref_date.day))
    days_remaining = max(0, days_in_month - days_elapsed)

    # Current daily run-rate
    daily_velocity = c_spend / float(days_elapsed)

    # Linear projection to end of month
    projected_eom = c_spend + (daily_velocity * float(days_remaining))
    projected_overrun = max(0.0, projected_eom - m_budget)

    # Discretionary ratio
    disc_ratio = (c_disc / c_spend * 100.0) if c_spend > 0 else 0.0

    # Recommended daily cap for remaining days to remain within budget
    budget_remaining = max(0.0, m_budget - c_spend)
    if days_remaining > 0:
        recommended_cap = budget_remaining / float(days_remaining)
    else:
        recommended_cap = 0.0

    # Overrun probability calculation
    # Ratio of projected spend to budget
    ratio = projected_eom / m_budget

    if c_spend > m_budget:
        prob = 1.0
        status = BudgetRiskStatus.DEFICIT_EXCEEDED
    elif ratio > 1.25:
        prob = min(0.99, 0.85 + (ratio - 1.25) * 0.3)
        status = BudgetRiskStatus.OVERRUN_IMMINENT
    elif ratio > 1.02:
        prob = 0.60 + (ratio - 1.0) * 1.5
        status = BudgetRiskStatus.CAUTION
    elif ratio > 0.90:
        prob = 0.30 + (ratio - 0.90) * 2.0
        status = BudgetRiskStatus.ON_TRACK
    else:
        prob = max(0.02, ratio * 0.25)
        status = BudgetRiskStatus.ON_TRACK

    prob = round(max(0.01, min(1.0, prob)), 3)

    # Breakdown of discretionary categories
    top_categories: List[Dict[str, Any]] = []
    if discretionary_by_category:
        sorted_cats = sorted(
            discretionary_by_category.items(),
            key=lambda x: _safe_float(x[1]),
            reverse=True,
        )
        for cat_name, cat_amt in sorted_cats[:4]:
            amt = _safe_float(cat_amt)
            if amt > 0:
                pct = (amt / c_spend * 100.0) if c_spend > 0 else 0.0
                top_categories.append({
                    "category": cat_name,
                    "amount": round(amt, 2),
                    "percentage_of_spend": round(pct, 1),
                })

    # Actionable advice
    if status == BudgetRiskStatus.DEFICIT_EXCEEDED:
        advice = f"You have reached 100% of your ₹{m_budget:,.0f} budget on day {days_elapsed}. Restrict non-essential discretionary purchases for the next {days_remaining} days."
    elif status == BudgetRiskStatus.OVERRUN_IMMINENT:
        advice = f"At your current daily burn of ₹{daily_velocity:,.0f}/day, you are on track to exceed budget by ₹{projected_overrun:,.0f}. Keep daily spending under ₹{recommended_cap:,.0f}/day to balance your ledger."
    elif status == BudgetRiskStatus.CAUTION:
        advice = f"Spending is pacing slightly ahead of plan ({ratio * 100:.0f}% of budget pacing). Target ₹{recommended_cap:,.0f}/day over the next {days_remaining} days to stay safe."
    else:
        advice = f"Spending is well controlled ({ratio * 100:.0f}% of target velocity). You have ₹{recommended_cap:,.0f}/day buffer remaining for the rest of the month."

    return BudgetOverrunForecast(
        monthly_budget=round(m_budget, 2),
        current_spend=round(c_spend, 2),
        current_discretionary_spend=round(c_disc, 2),
        discretionary_ratio_pct=round(disc_ratio, 1),
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        current_daily_velocity=round(daily_velocity, 2),
        projected_eom_spend=round(projected_eom, 2),
        projected_overrun=round(projected_overrun, 2),
        overrun_probability=prob,
        risk_status=status,
        recommended_daily_cap=round(recommended_cap, 2),
        top_discretionary_categories=top_categories,
        actionable_advice=advice,
    )


# ============================================================================
# 3. Circadian Drift Detector
# ============================================================================

def detect_circadian_drift(
    bedtimes: List[Optional[time | str]],
    wake_times: Optional[List[Optional[time | str]]] = None,
    entry_dates: Optional[List[date]] = None,
) -> CircadianDriftForecast:
    """
    Evaluates circadian stability across consecutive nights.
    Detects phase delay (bedtime creeping later), phase advance,
    and irregular social jetlag (weekday vs weekend differences).
    """
    # Convert bedtimes to relative minutes from midnight
    valid_bed_mins: List[Tuple[int, int]] = []  # (index, minutes)
    for idx, bt in enumerate(bedtimes):
        m = _time_to_minutes_from_midnight(bt)
        if m is not None:
            valid_bed_mins.append((idx, m))

    if len(valid_bed_mins) < 2:
        # Default stable payload with insufficient data
        return CircadianDriftForecast(
            status=CircadianStatus.STABLE,
            alert_level=RiskLevel.LOW,
            bedtime_variance_minutes=0.0,
            max_shift_minutes=0.0,
            consecutive_drift_days=0,
            average_bedtime="Not enough data",
            average_wake_time="Not enough data",
            social_jetlag_minutes=0.0,
            resynchronization_protocol="Insufficient sleep logs yet (need ≥2 nights). Maintain a steady bedtime to calibrate circadian rhythm.",
        )

    mins_only = [m for _, m in valid_bed_mins]
    n = len(mins_only)
    avg_mins = sum(mins_only) / float(n)

    # Standard deviation in minutes
    variance = sum((m - avg_mins) ** 2 for m in mins_only) / float(n - 1) if n > 1 else 0.0
    std_mins = math.sqrt(variance)

    # Calculate day-to-day shifts
    shifts: List[float] = []
    consecutive_delay_count = 0
    max_consecutive_delay = 0

    for i in range(1, len(valid_bed_mins)):
        prev_idx, prev_m = valid_bed_mins[i - 1]
        curr_idx, curr_m = valid_bed_mins[i]

        # Only measure shift if genuinely contiguous days
        is_contiguous = (curr_idx == prev_idx + 1)
        if is_contiguous and entry_dates and len(entry_dates) > curr_idx and len(entry_dates) > prev_idx:
            d_curr = entry_dates[curr_idx]
            d_prev = entry_dates[prev_idx]
            if d_curr and d_prev:
                try:
                    if (d_curr - d_prev).days != 1:
                        is_contiguous = False
                except Exception:
                    pass

        if is_contiguous:
            diff = curr_m - prev_m  # Positive = delayed later, Negative = advanced earlier
            shifts.append(diff)
            if diff >= 60.0:  # Shifted at least 1 hour later
                consecutive_delay_count += 1
                max_consecutive_delay = max(max_consecutive_delay, consecutive_delay_count)
            else:
                consecutive_delay_count = 0
        else:
            consecutive_delay_count = 0

    # Keep the signed extreme so callers can distinguish delayed (+) from
    # advanced (−) schedules; magnitude alone makes "advance" unreachable.
    max_shift = max(shifts, default=0.0, key=abs)

    # Compute social jetlag if dates available
    social_jetlag = 0.0
    if entry_dates and len(entry_dates) == len(bedtimes):
        weekday_beds: List[int] = []
        weekend_beds: List[int] = []
        for d, bt in zip(entry_dates, bedtimes):
            m = _time_to_minutes_from_midnight(bt)
            if m is not None and d is not None:
                if d.weekday() in (4, 5):  # Friday or Saturday night
                    weekend_beds.append(m)
                else:
                    weekday_beds.append(m)

        if weekday_beds and weekend_beds:
            avg_weekday = sum(weekday_beds) / len(weekday_beds)
            avg_weekend = sum(weekend_beds) / len(weekend_beds)
            social_jetlag = abs(avg_weekend - avg_weekday)

    # Calculate average wake time if available
    avg_wake = "07:00"
    if wake_times:
        wake_mins: List[int] = []
        for wt in wake_times:
            wm = _time_to_minutes_from_midnight(wt)
            if wm is not None:
                # Wake time in absolute minutes from midnight (0 to 1440)
                wm_norm = wm if wm >= 0 else wm + 1440
                wake_mins.append(wm_norm)
        if wake_mins:
            avg_wake = _minutes_to_time_str(sum(wake_mins) / len(wake_mins))

    # Classification logic
    avg_bed_str = _minutes_to_time_str(avg_mins)

    if max_consecutive_delay >= 2 or (std_mins >= 90.0 and avg_mins > 90):
        status = CircadianStatus.PHASE_DELAY
        alert_level = RiskLevel.CRITICAL if std_mins > 120.0 else RiskLevel.HIGH
        protocol = "Circadian Phase Delay Detected. Reset your circadian pacemaker: view bright natural sunlight for 15 minutes within 30 minutes of waking, and enforce a digital screen curfew 90 minutes before your target bedtime."
    elif social_jetlag >= 90.0:
        status = CircadianStatus.IRREGULAR_SOCIAL_JETLAG
        alert_level = RiskLevel.HIGH
        protocol = f"Social Jetlag Alert: Your weekend sleep schedule shifts by {social_jetlag:.0f} minutes compared to weekdays. This produces internal desynchrony equivalent to crossing 2 time zones. Keep wake-up times within 45 minutes across all 7 days."
    elif std_mins >= 60.0 or abs(max_shift) >= 90.0:
        status = CircadianStatus.PHASE_DELAY if avg_mins > 60 else CircadianStatus.STABLE
        alert_level = RiskLevel.MODERATE
        protocol = "Moderate bedtime irregularity detected (variance ±{std:.0f} min). Aligning your bedtime within a 30-minute window significantly increases Deep and REM sleep efficiency.".format(std=std_mins)
    else:
        status = CircadianStatus.STABLE
        alert_level = RiskLevel.LOW
        protocol = "Circadian rhythm is stable. Your sleep-wake schedule demonstrates high consistency, providing optimal hormonal and cognitive restoration."

    return CircadianDriftForecast(
        status=status,
        alert_level=alert_level,
        bedtime_variance_minutes=round(std_mins, 1),
        max_shift_minutes=round(max_shift, 1),
        consecutive_drift_days=max_consecutive_delay,
        average_bedtime=avg_bed_str,
        average_wake_time=avg_wake,
        social_jetlag_minutes=round(social_jetlag, 1),
        resynchronization_protocol=protocol,
    )


# ============================================================================
# 4. Composite Behavioral Risk Engine
# ============================================================================

def generate_composite_risk_forecast(
    sleep_hours: float,
    sleep_quality: int,
    bedtime: Optional[time | str],
    recent_bedtimes: List[Optional[time | str]],
    current_spend: float,
    current_discretionary_spend: float,
    monthly_budget: float,
    energy_level: Optional[int] = None,
    steps_yesterday: Optional[int] = None,
    consecutive_inactive_days: int = 0,
    scheduled_deep_work_hours: float = 0.0,
    discretionary_by_category: Optional[Dict[str, float]] = None,
    as_of_date: Optional[date] = None,
) -> CompositeRiskForecast:
    """
    Consolidates all predictive risk heads into a unified composite forecast.
    """
    ref_date = as_of_date or date.today()

    workout_f = calculate_workout_skip_risk(
        sleep_hours=sleep_hours,
        sleep_quality=sleep_quality,
        bedtime=bedtime,
        energy_level=energy_level,
        steps_yesterday=steps_yesterday,
        consecutive_inactive_days=consecutive_inactive_days,
        scheduled_deep_work_hours=scheduled_deep_work_hours,
    )

    budget_f = forecast_budget_overrun(
        current_spend=current_spend,
        current_discretionary_spend=current_discretionary_spend,
        monthly_budget=monthly_budget,
        as_of_date=ref_date,
        discretionary_by_category=discretionary_by_category,
    )

    circadian_f = detect_circadian_drift(
        bedtimes=recent_bedtimes,
    )

    # Composite risk index (0 to 100, where 100 is maximum risk)
    # Weighted: Workout skip (35%), Budget overrun (40%), Circadian drift (25%)
    w_workout = workout_f.probability * 35.0
    w_budget = budget_f.overrun_probability * 40.0
    w_circadian = (
        25.0 if circadian_f.alert_level == RiskLevel.CRITICAL else
        18.0 if circadian_f.alert_level == RiskLevel.HIGH else
        10.0 if circadian_f.alert_level == RiskLevel.MODERATE else 2.0
    )

    overall_score = round(min(100.0, w_workout + w_budget + w_circadian), 1)

    # Key vulnerability summary
    vulnerabilities = []
    if workout_f.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
        vulnerabilities.append(f"High workout skip risk ({int(workout_f.probability * 100)}%) driven by {workout_f.primary_driver.lower()}")
    if budget_f.risk_status in (BudgetRiskStatus.OVERRUN_IMMINENT, BudgetRiskStatus.DEFICIT_EXCEEDED):
        vulnerabilities.append(f"Spending run-rate exceeding monthly budget by ₹{budget_f.projected_overrun:,.0f}")
    if circadian_f.alert_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
        vulnerabilities.append(f"Circadian delay of ±{circadian_f.bedtime_variance_minutes:.0f} min disrupting recovery")

    if vulnerabilities:
        key_summary = " • ".join(vulnerabilities)
    else:
        key_summary = "All behavioral risk indicators are within safe thresholds. Routine consistency is optimal."

    return CompositeRiskForecast(
        date=ref_date.isoformat(),
        workout_skip=workout_f,
        budget_overrun=budget_f,
        circadian_drift=circadian_f,
        overall_risk_score=overall_score,
        key_vulnerability_summary=key_summary,
    )

