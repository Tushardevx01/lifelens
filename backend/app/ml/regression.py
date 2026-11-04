"""
Random Forest Regressor — Productivity Prediction for LifeLens AI.

Fixes applied:
  - MODELS_DIR is now absolute
  - predict_tomorrow guards for NaN lag features
  - confidence interval clipped to [0, 100]
"""

from app.ml.base import MODELS_DIR

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


REGRESSION_FEATURES = [
    'sleep_score_lag1',
    'screen_time_lag1',
    'activity_index_lag1',
    'mood_score_lag1',
    'sleep_7d_avg',
    'distraction_7d_avg',
    'sleep_7d_std',
]
REGRESSION_TARGET = 'productivity_score'




def train_regression_pipeline(df: pd.DataFrame, user_id: str) -> dict:
    """
    Train RF regressor with TimeSeriesSplit (no future data leakage).
    """
    df_clean = df[REGRESSION_FEATURES + [REGRESSION_TARGET]].dropna()

    if len(df_clean) < 14:
        raise ValueError(f"Need at least 14 clean data points. Got {len(df_clean)}.")

    X = df_clean[REGRESSION_FEATURES]
    y = df_clean[REGRESSION_TARGET]

    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(
            n_estimators=100,
            max_depth=6,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=1,
        )),
    ])

    n_splits = min(5, max(2, len(df_clean) // 5))
    tscv = TimeSeriesSplit(n_splits=n_splits)
    rmse_scores: list[float] = []

    for train_idx, test_idx in tscv.split(X):
        X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
        y_tr, y_te = y.iloc[train_idx], y.iloc[test_idx]
        pipe.fit(X_tr, y_tr)
        preds = pipe.predict(X_te)
        rmse  = float(np.sqrt(np.mean((preds - y_te.values) ** 2)))
        rmse_scores.append(rmse)

    # Final fit on full dataset
    pipe.fit(X, y)

    feature_importances = dict(zip(
        REGRESSION_FEATURES,
        [round(float(v) * 100, 1) for v in pipe.named_steps['rf'].feature_importances_],
    ))

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / f"rf_{user_id}.joblib"
    joblib.dump(pipe, model_path)

    return {
        'model_path':          str(model_path),
        'rmse_mean':           round(float(np.mean(rmse_scores)), 2),
        'rmse_std':            round(float(np.std(rmse_scores)), 2),
        'n_samples':           len(df_clean),
        'feature_importances': feature_importances,
    }


def predict_tomorrow(today_features: pd.DataFrame, user_id: str) -> dict:
    """
    Predict next-day productivity.
    FIX: returns empty dict with reason if any required feature is NaN.
    """
    model_path = MODELS_DIR / f"rf_{user_id}.joblib"
    if not model_path.exists():
        return {}

    # FIX: guard for NaN lag features (insufficient history for some columns)
    X = today_features[REGRESSION_FEATURES]
    if X.isna().any(axis=None):
        missing = X.columns[X.isna().any()].tolist()
        return {
            'reason': f'Insufficient data for features: {missing}',
            'predicted_productivity': None,
        }

    pipe = joblib.load(model_path)
    rf   = pipe.named_steps['rf']

    X_scaled   = pipe.named_steps['scaler'].transform(X)
    tree_preds = np.array([t.predict(X_scaled) for t in rf.estimators_])

    mean_pred  = float(np.clip(np.mean(tree_preds), 0, 100))
    ci_lower   = float(np.clip(np.percentile(tree_preds, 10), 0, 100))
    ci_upper   = float(np.clip(np.percentile(tree_preds, 90), 0, 100))

    importances    = rf.feature_importances_
    key_driver_idx = int(np.argmax(importances))
    key_driver     = REGRESSION_FEATURES[key_driver_idx]
    key_driver_pct = round(float(importances[key_driver_idx]) * 100, 1)

    tips = {
        'sleep_score_lag1':    "Sleep 7–9 hours tonight to boost tomorrow's score.",
        'screen_time_lag1':    "Keep screen time under 3 hours today.",
        'activity_index_lag1': "Hit 10,000 steps to improve tomorrow's output.",
        'mood_score_lag1':     "Your mood is the key driver — rest and recharge.",
        'sleep_7d_avg':        "Maintain consistent sleep over the next few days.",
        'distraction_7d_avg':  "Reduce weekly distractions to improve output.",
        'sleep_7d_std':        "Irregular sleep is hurting you — aim for a consistent bedtime.",
    }

    return {
        'predicted_productivity':    round(mean_pred, 1),
        'confidence_interval':       {'lower': round(ci_lower, 1), 'upper': round(ci_upper, 1)},
        'key_driver':                key_driver,
        'key_driver_importance_pct': key_driver_pct,
        'improvement_tip':           tips.get(key_driver, "Focus on healthy habits."),
        'feature_importances':       dict(zip(
            REGRESSION_FEATURES,
            [round(float(v) * 100, 1) for v in importances],
        )),
    }


def model_exists(user_id: str) -> bool:
    return (MODELS_DIR / f"rf_{user_id}.joblib").exists()
