"""
Life Score computation for LifeLens AI.

The Life Score is a transparent, explainable composite index (0-100).
Always show the component breakdown — users lose trust if the number
feels like a black box.
"""


WEIGHTS = {
    'sleep':        0.30,   # Most impactful — controls alertness, mood, recovery
    'productivity': 0.25,   # Core output metric
    'health':       0.25,   # Steps, activity — physical foundation
    'finance':      0.20,   # Financial wellbeing (spend relative to average)
}

MOOD_MODIFIER_MAX = 5.0     # Mood adjusts score by up to ±5 points


def compute_life_score(
    sleep_score: float,          # 0-100
    productivity_score: float,   # 0-100
    activity_index: float,       # 0-1
    finance_score: float,        # 0-100
    mood_score: float | None,    # 1-10, optional
) -> dict:
    """
    Weighted sum of 4 components + mood modifier.
    Returns composite score and all components.
    """
    health_score = activity_index * 100   # convert 0-1 → 0-100

    raw = (
        sleep_score        * WEIGHTS['sleep']        +
        productivity_score * WEIGHTS['productivity'] +
        health_score       * WEIGHTS['health']        +
        finance_score      * WEIGHTS['finance']
    )

    # Mood modifier: neutral = 5, range gives -5 to +5 adjustment
    mood_adj = 0.0
    if mood_score is not None:
        mood_adj = ((mood_score - 5.0) / 5.0) * MOOD_MODIFIER_MAX

    final = round(min(100.0, max(0.0, raw + mood_adj)), 1)

    return {
        'life_score':               final,
        'life_score_sleep':         round(sleep_score * WEIGHTS['sleep'], 1),
        'life_score_productivity':  round(productivity_score * WEIGHTS['productivity'], 1),
        'life_score_health':        round(health_score * WEIGHTS['health'], 1),
        'life_score_finance':       round(finance_score * WEIGHTS['finance'], 1),
        'mood_adjustment':          round(mood_adj, 1),
        # For the UI formula display:
        'formula_display': (
            f"Sleep {sleep_score:.0f}×0.30 + "
            f"Productivity {productivity_score:.0f}×0.25 + "
            f"Health {health_score:.0f}×0.25 + "
            f"Finance {finance_score:.0f}×0.20 "
            f"{'+ ' if mood_adj >= 0 else ''}{mood_adj:.1f} mood = "
            f"{final}"
        )
    }


def get_score_band(score: float) -> dict:
    """Return the label and color for a given Life Score."""
    if score >= 85:
        return {"label": "Optimal", "color": "green", "hex": "#22c55e"}
    elif score >= 70:
        return {"label": "Good", "color": "teal", "hex": "#14b8a6"}
    elif score >= 55:
        return {"label": "Average", "color": "yellow", "hex": "#eab308"}
    elif score >= 40:
        return {"label": "Below Average", "color": "orange", "hex": "#f97316"}
    else:
        return {"label": "Critical", "color": "red", "hex": "#ef4444"}
