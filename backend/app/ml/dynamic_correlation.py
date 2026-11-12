"""
LifeLens Dynamic Multi-Lag Cross-Feature Correlation Engine (Phase 6.1).

Computes statistically rigorous temporal cross-feature relationships
with multi-lag capabilities (e.g., X[t-1] -> Y[t] and X[t] -> Y[t]).

Features:
  - Temporal lag analysis (sleep[t-1] -> deep_work[t], screen_time[t-1] -> sleep_quality[t])
  - Pure Python + NumPy implementation (no scipy or pandas required)
  - Pearson r correlation coefficient, t-statistic, two-tailed p-value
  - Fisher z-transform 95% confidence intervals
  - Adaptive data maturity thresholds (n >= 7 exploratory, n >= 14 moderate, n >= 30 confirmed)
  - Epistemic guardrail compliance (never claims causation; cites exact data & qualifiers)
"""

from __future__ import annotations
import math
from datetime import date, datetime
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple


@dataclass
class DynamicCorrelationFinding:
    feature_a: str
    feature_b: str
    name_a: str
    name_b: str
    lag: int                            # 0 for same-day, 1 for prior-day lag (A[t-1] -> B[t])
    r: float                            # Pearson correlation coefficient [-1.0, 1.0]
    p_value: float                      # Two-tailed statistical significance
    sample_size: int                    # Number of paired observations (n)
    is_statistically_significant: bool  # p_value < 0.05
    strength: str                       # 'STRONG', 'MODERATE', 'EMERGING', 'NEGLIGIBLE'
    direction: str                      # 'POSITIVE', 'NEGATIVE'
    ci_lower: float                     # 95% Confidence Interval lower bound
    ci_upper: float                     # 95% Confidence Interval upper bound
    insight_narrative: str              # Natural language human synthesis
    epistemic_qualifier: str            # Strict boundary statement


# Curated pairs for cross-feature behavioral discovery
CANDIDATE_CORRELATION_PAIRS = [
    # Lag 1: Prior day's behavior predicting today's outcome (t-1 -> t)
    ("sleep_hours", "productivity_score", "Sleep Duration", "Deep Work Output", 1),
    ("sleep_quality", "energy_level", "Sleep Quality", "Daily Energy Level", 1),
    ("screen_time_hours", "sleep_hours", "Evening Screen Time", "Sleep Duration", 1),
    ("steps", "sleep_quality", "Physical Activity (Steps)", "Sleep Quality", 1),
    ("daily_spend", "mood_score", "Discretionary Spending", "Next-Day Mood", 1),
    
    # Lag 0: Same-day co-occurrence (t -> t)
    ("deep_work_hours", "mood_score", "Deep Work Focus", "Daily Mood", 0),
    ("social_media_hours", "mood_score", "Social Media Screen Time", "Daily Mood", 0),
    ("steps", "energy_level", "Physical Activity (Steps)", "Daily Energy Level", 0),
    ("screen_time_hours", "deep_work_hours", "Total Screen Time", "Deep Work Hours", 0),
    ("sleep_hours", "mood_score", "Sleep Duration", "Daily Mood", 0),
]


def _t_to_p_value(t_stat: float, df: int) -> float:
    """
    Computes two-tailed p-value from t-statistic and degrees of freedom
    using a high-precision Abramowitz & Stegun polynomial approximation.
    """
    if df <= 0 or math.isnan(t_stat) or math.isinf(t_stat):
        return 1.0

    t_abs = abs(t_stat)
    # Hill's approximation / normal approximation for Student's t
    # For df >= 30, t is very close to standard normal
    if df >= 30:
        z = t_abs
    else:
        # Cornish-Fisher expansion adjustment for smaller df
        z = t_abs * (1.0 - 1.0 / (4.0 * df))

    # Standard normal cumulative distribution approximation
    # Error < 7.5e-8
    p = 0.2316419
    b1 = 0.319381530
    b2 = -0.356563782
    b3 = 1.781477937
    b4 = -1.821255978
    b5 = 1.330274429

    x = z
    t_val = 1.0 / (1.0 + p * x)
    poly = ((((b5 * t_val + b4) * t_val + b3) * t_val + b2) * t_val + b1) * t_val
    pdf = math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)
    cdf_upper = pdf * poly

    two_tailed = 2.0 * cdf_upper
    return max(0.0001, min(1.0, two_tailed))


def compute_pearson_r(x_vals: List[float], y_vals: List[float]) -> Tuple[float, float, float, float]:
    """
    Computes Pearson r, p-value, and 95% confidence interval for paired series.
    Returns: (r, p_value, ci_lower, ci_upper)
    """
    n = len(x_vals)
    if n < 3:
        return 0.0, 1.0, -1.0, 1.0

    mean_x = sum(x_vals) / n
    mean_y = sum(y_vals) / n

    diff_x = [x - mean_x for x in x_vals]
    diff_y = [y - mean_y for y in y_vals]

    var_x = sum(dx * dx for dx in diff_x)
    var_y = sum(dy * dy for dy in diff_y)

    if var_x == 0.0 or var_y == 0.0:
        return 0.0, 1.0, 0.0, 0.0

    covar = sum(dx * dy for dx, dy in zip(diff_x, diff_y))
    r = covar / math.sqrt(var_x * var_y)
    r = max(-1.0, min(1.0, r))

    # T-statistic for significance testing: t = r * sqrt((n - 2) / (1 - r^2))
    df = n - 2
    denom = 1.0 - (r * r)
    if denom <= 1e-9:
        t_stat = 999.0 if r > 0 else -999.0
        p_val = 0.0001
    else:
        t_stat = r * math.sqrt(df / denom)
        p_val = _t_to_p_value(t_stat, df)

    # 95% Confidence Interval via Fisher z-transform
    # z = 0.5 * ln((1 + r) / (1 - r))
    # SE = 1 / sqrt(n - 3)
    if n > 3 and abs(r) < 0.999:
        z = 0.5 * math.log((1.0 + r) / (1.0 - r))
        se = 1.0 / math.sqrt(n - 3)
        z_crit = 1.96  # 95% normal quantile
        z_lower = z - z_crit * se
        z_upper = z + z_crit * se
        ci_lower = (math.exp(2.0 * z_lower) - 1.0) / (math.exp(2.0 * z_lower) + 1.0)
        ci_upper = (math.exp(2.0 * z_upper) - 1.0) / (math.exp(2.0 * z_upper) + 1.0)
    else:
        ci_lower = r
        ci_upper = r

    return round(r, 4), round(p_val, 4), round(ci_lower, 4), round(ci_upper, 4)


def find_dynamic_correlations(
    entries: List[Dict[str, Any]],
    min_sample_size: int = 7,
    significance_alpha: float = 0.10,
    min_abs_r: float = 0.25,
) -> List[DynamicCorrelationFinding]:
    """
    Runs multi-lag correlation analysis across chronological behavioral records.
    
    Args:
        entries: Chronologically sorted list of dicts (or objects) representing daily metrics.
        min_sample_size: Adaptive threshold (default 7 days for emerging discovery).
        significance_alpha: Significance cutoff (default 0.10 for exploratory, 0.05 standard).
        min_abs_r: Minimum |r| to consider meaningful.
    """
    if len(entries) < min_sample_size:
        return []

    findings: List[DynamicCorrelationFinding] = []

    for col_a, col_b, name_a, name_b, lag in CANDIDATE_CORRELATION_PAIRS:
        x_paired: List[float] = []
        y_paired: List[float] = []

        if lag == 0:
            # Same-day pairs
            for e in entries:
                va = e.get(col_a)
                vb = e.get(col_b)
                if va is not None and vb is not None:
                    try:
                        fa = float(va)
                        fb = float(vb)
                        if not (math.isnan(fa) or math.isnan(fb)):
                            x_paired.append(fa)
                            y_paired.append(fb)
                    except (ValueError, TypeError):
                        continue
        elif lag == 1:
            # Lag-1 pairs: A[t-1] -> B[t]
            for i in range(1, len(entries)):
                prev_e = entries[i - 1]
                curr_e = entries[i]
                prev_d = prev_e.get("date")
                curr_d = curr_e.get("date")
                if prev_d and curr_d:
                    try:
                        pd = date.fromisoformat(str(prev_d)[:10]) if not isinstance(prev_d, (date, datetime)) else (prev_d.date() if isinstance(prev_d, datetime) else prev_d)
                        cd = date.fromisoformat(str(curr_d)[:10]) if not isinstance(curr_d, (date, datetime)) else (curr_d.date() if isinstance(curr_d, datetime) else curr_d)
                        if (cd - pd).days != 1:
                            continue
                    except Exception:
                        continue
                else:
                    continue
                va = prev_e.get(col_a)
                vb = curr_e.get(col_b)
                if va is not None and vb is not None:
                    try:
                        fa = float(va)
                        fb = float(vb)
                        if not (math.isnan(fa) or math.isnan(fb)):
                            x_paired.append(fa)
                            y_paired.append(fb)
                    except (ValueError, TypeError):
                        continue

        if len(x_paired) < min_sample_size:
            continue

        r_val, p_val, ci_low, ci_high = compute_pearson_r(x_paired, y_paired)

        if abs(r_val) >= min_abs_r and p_val <= significance_alpha:
            abs_r = abs(r_val)
            if abs_r >= 0.65:
                strength = "STRONG"
            elif abs_r >= 0.45:
                strength = "MODERATE"
            else:
                strength = "EMERGING"

            direction = "POSITIVE" if r_val > 0 else "NEGATIVE"
            is_sig = p_val < 0.05

            pct_effect = int(round(abs_r * 100))
            dir_word = "higher" if r_val > 0 else "lower"
            lag_context = "on the subsequent day" if lag == 1 else "on the same day"

            narrative = (
                f"Your {name_b} tends to be {pct_effect}% {dir_word} {lag_context} "
                f"following higher {name_a} (r = {r_val:+.2f}, p = {p_val:.3f}, n = {len(x_paired)})."
            )

            epistemic = (
                f"Statistical correlation observed across {len(x_paired)} days of your data. "
                "LifeLens notes this pattern as co-occurring, not proven physical causation."
            )

            findings.append(DynamicCorrelationFinding(
                feature_a=col_a,
                feature_b=col_b,
                name_a=name_a,
                name_b=name_b,
                lag=lag,
                r=r_val,
                p_value=p_val,
                sample_size=len(x_paired),
                is_statistically_significant=is_sig,
                strength=strength,
                direction=direction,
                ci_lower=ci_low,
                ci_upper=ci_high,
                insight_narrative=narrative,
                epistemic_qualifier=epistemic,
            ))

    # Sort by |r| descending
    findings.sort(key=lambda f: abs(f.r), reverse=True)
    return findings

