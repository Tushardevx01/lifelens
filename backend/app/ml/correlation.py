"""
Pearson Correlation Analysis for LifeLens AI.

Finds statistically significant behavioral relationships.
Generates the "X predicts Y" insights most memorable to users.
"""

import pandas as pd
from scipy.stats import pearsonr


CORRELATION_PAIRS = [
    ('sleep_hours',       'productivity_score',  "sleep",             "productivity"),
    ('sleep_hours',       'mood_score',           "sleep",             "mood"),
    ('screen_time_hours', 'productivity_score',   "screen time",       "productivity"),
    ('steps',             'mood_score',           "physical activity", "mood"),
    ('daily_spend',       'mood_score',           "spending",          "mood"),
    ('sleep_hours',       'steps',                "sleep",             "physical activity"),
    ('screen_time_hours', 'sleep_hours',          "screen time",       "sleep"),
    ('deep_work_hours',   'mood_score',           "deep work",         "mood"),
]

MIN_DATA_FOR_CORRELATION = 30
SIGNIFICANCE_THRESHOLD   = 0.05
CORRELATION_THRESHOLD    = 0.40     # |r| > 0.4 considered meaningful for behavioral data


def analyse_correlations(df: pd.DataFrame) -> list[dict]:
    """
    Compute Pearson r for all defined pairs on the raw daily_entries DataFrame.
    Returns significant findings sorted by |r| descending.
    """
    if len(df) < MIN_DATA_FOR_CORRELATION:
        return []

    findings: list[dict] = []

    for col_a, col_b, name_a, name_b in CORRELATION_PAIRS:
        if col_a not in df.columns or col_b not in df.columns:
            continue

        pair_df = df[[col_a, col_b]].dropna()
        if len(pair_df) < MIN_DATA_FOR_CORRELATION:
            continue

        if pair_df[col_a].std() == 0 or pair_df[col_b].std() == 0:
            continue

        try:
            r_val, p_val = pearsonr(pair_df[col_a], pair_df[col_b])
        except Exception:
            continue

        if pd.isna(r_val) or pd.isna(p_val):
            continue

        if abs(r_val) >= CORRELATION_THRESHOLD and p_val < SIGNIFICANCE_THRESHOLD:
            direction = "higher" if r_val > 0 else "lower"
            strength  = (
                "strongly"   if abs(r_val) >= 0.7 else
                "moderately" if abs(r_val) >= 0.5 else
                "slightly"
            )
            pct_effect = round(abs(r_val) * 100)

            findings.append({
                'feature_a':      col_a,
                'feature_b':      col_b,
                'name_a':         name_a,
                'name_b':         name_b,
                'r':              round(float(r_val), 4),
                'p_value':        round(float(p_val), 6),
                'abs_r':          abs(float(r_val)),
                'strength':       strength,
                'insight_message': (
                    f"Your {name_b} tends to be {pct_effect}% "
                    f"{direction} on days with high {name_a}."
                ),
            })

    return sorted(findings, key=lambda x: x['abs_r'], reverse=True)
