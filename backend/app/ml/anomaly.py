"""
Isolation Forest Anomaly Detection for LifeLens AI.

Fixes applied:
  - MODELS_DIR is now absolute
  - contamination is dynamic: min(0.05, 3/n_samples) to avoid false positives
    on small datasets (14 days → at most 0.21 contamination)
"""

from app.ml.base import MODELS_DIR

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


ANOMALY_FEATURES = [
    'sleep_score',
    'distraction_level',
    'activity_index',
    'productivity_score',
    'spend_ratio',
]

ANOMALY_THRESHOLD = 0.65   # normalized score above this → anomaly




def train_anomaly_detector(df: pd.DataFrame, user_id: str) -> dict:
    """
    Train Isolation Forest.
    FIX: contamination = min(0.05, 3/n) so small datasets don't force-flag entries.
    """
    X = df[ANOMALY_FEATURES].dropna()

    if len(X) < 14:
        raise ValueError(f"Need at least 14 data points. Got {len(X)}.")

    # FIX: dynamic contamination avoids false positives on small datasets
    contamination = min(0.05, 3 / len(X))

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        n_jobs=1,
    )
    model.fit(X_scaled)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path  = MODELS_DIR / f"isolation_forest_{user_id}.joblib"
    scaler_path = MODELS_DIR / f"anomaly_scaler_{user_id}.joblib"
    joblib.dump(model,  model_path)
    joblib.dump(scaler, scaler_path)

    return {
        'model_path':    str(model_path),
        'n_samples':     len(X),
        'contamination': round(contamination, 4),
        'n_estimators':  100,
    }


def detect_anomaly(
    df_row: pd.DataFrame,
    user_id: str,
    df_history: pd.DataFrame,
) -> dict:
    """
    Score a single day. Returns anomaly_score (0–1), is_anomaly, feature_deviations.
    """
    model_path  = MODELS_DIR / f"isolation_forest_{user_id}.joblib"
    scaler_path = MODELS_DIR / f"anomaly_scaler_{user_id}.joblib"

    if not model_path.exists() or not scaler_path.exists():
        return {'anomaly_score': 0.0, 'is_anomaly': False, 'feature_deviations': {}}

    model  = joblib.load(model_path)
    scaler = joblib.load(scaler_path)

    X        = df_row[ANOMALY_FEATURES]
    X_scaled = scaler.transform(X)

    raw_score     = float(model.decision_function(X_scaled)[0])
    anomaly_score = round(max(0.0, min(1.0, -raw_score + 0.5)), 4)
    is_anomaly    = anomaly_score > ANOMALY_THRESHOLD

    feature_deviations: dict  = {}
    primary_feature: str | None = None

    if is_anomaly and len(df_history) >= 7:
        history_stats = df_history[ANOMALY_FEATURES].agg(['mean', 'std'])
        max_z = 0.0

        for feat in ANOMALY_FEATURES:
            val  = float(df_row[feat].values[0])
            mean = float(history_stats.loc['mean', feat])
            std  = float(history_stats.loc['std', feat]) or 0.001
            z    = abs((val - mean) / std)

            if z > 2.0:
                direction = "above" if val > mean else "below"
                feature_deviations[feat] = {
                    'value':     round(val, 2),
                    'user_avg':  round(mean, 2),
                    'z_score':  round(z, 2),
                    'direction': direction,
                    'magnitude': f"{round(abs(val - mean) / max(mean, 0.01) * 100, 0):.0f}% {direction} average",
                }
                if z > max_z:
                    max_z           = z
                    primary_feature = feat

    return {
        'anomaly_score':           anomaly_score,
        'is_anomaly':              is_anomaly,
        'feature_deviations':      feature_deviations,
        'primary_anomaly_feature': primary_feature,
    }


def model_exists(user_id: str) -> bool:
    return (MODELS_DIR / f"isolation_forest_{user_id}.joblib").exists()
