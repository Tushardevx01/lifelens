"""
K-Means Clustering Pipeline for LifeLens AI.

Fixes applied per audit:
  - MODELS_DIR is now absolute (relative path caused Celery worker failures)
  - find_optimal_k is called when enough data is available
  - predict_cluster guards for missing labels file
"""

from app.ml.base import MODELS_DIR
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


CLUSTERING_FEATURES = [
    'sleep_score',
    'distraction_level',
    'activity_index',
    'productivity_score',
    'spend_ratio',
]




def find_optimal_k(df: pd.DataFrame, k_range: range = range(2, 7)) -> int:
    """Silhouette score search. Returns best k in given range."""
    X = df[CLUSTERING_FEATURES].dropna()
    if len(X) < max(k_range):
        return min(4, len(X) - 1)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    best_k, best_sil = 4, -1.0
    for k in k_range:
        if k >= len(X):
            break
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        if len(set(labels)) > 1:
            sil = silhouette_score(X_scaled, labels)
            if sil > best_sil:
                best_sil, best_k = sil, k

    return best_k


def label_clusters(pipeline: Pipeline, X: pd.DataFrame) -> dict[int, str]:
    """
    Name each cluster by centroid's dominant feature pattern.
    """
    scaler  = pipeline.named_steps['scaler']
    kmeans  = pipeline.named_steps['kmeans']
    centroids   = scaler.inverse_transform(kmeans.cluster_centers_)
    centroid_df = pd.DataFrame(centroids, columns=CLUSTERING_FEATURES)

    label_map: dict[int, str] = {}
    for i, row in centroid_df.iterrows():
        dominant = str(row.idxmax())
        if dominant == 'productivity_score' and row['sleep_score'] > 60:
            label_map[int(i)] = "Deep Work Day"
        elif dominant == 'distraction_level':
            label_map[int(i)] = "Distracted Day"
        elif row['sleep_score'] > 70 and row['productivity_score'] < 40:
            label_map[int(i)] = "Recovery Day"
        else:
            label_map[int(i)] = "Low Intensity Day"

    return label_map


def train_clustering_pipeline(df: pd.DataFrame, user_id: str) -> dict:
    """
    Train StandardScaler → KMeans pipeline.
    FIX: calls find_optimal_k when enough data (≥30 rows), else defaults to 4.
    """
    X = df[CLUSTERING_FEATURES].dropna()

    if len(X) < 14:
        raise ValueError(f"Need at least 14 data points. Got {len(X)}.")

    # FIX: use optimal k when sufficient data, otherwise cap at 4
    k = find_optimal_k(df) if len(X) >= 30 else min(4, len(X) - 1)
    k = max(2, k)   # k must be at least 2

    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('kmeans', KMeans(n_clusters=k, random_state=42, n_init=10)),
    ])
    pipe.fit(X)

    X_scaled  = pipe.named_steps['scaler'].transform(X)
    labels    = pipe.named_steps['kmeans'].labels_
    sil_score = silhouette_score(X_scaled, labels) if len(set(labels)) > 1 else 0.0

    label_map = label_clusters(pipe, X)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path  = MODELS_DIR / f"kmeans_{user_id}.joblib"
    labels_path = MODELS_DIR / f"cluster_labels_{user_id}.json"
    joblib.dump(pipe, model_path)
    with open(labels_path, 'w') as f:
        json.dump({str(k): v for k, v in label_map.items()}, f)

    return {
        'model_path':       str(model_path),
        'silhouette_score': round(sil_score, 4),
        'n_samples':        len(X),
        'k':                k,
        'cluster_labels':   label_map,
    }


def predict_cluster(df_row: pd.DataFrame, user_id: str) -> tuple[int, str]:
    """
    Predict cluster for a single day.
    FIX: guards for missing labels file separately from missing model file.
    """
    model_path  = MODELS_DIR / f"kmeans_{user_id}.joblib"
    labels_path = MODELS_DIR / f"cluster_labels_{user_id}.json"

    if not model_path.exists():
        return -1, "Unknown"

    pipe = joblib.load(model_path)

    # FIX: guard for missing labels file (model exists but labels were deleted)
    if not labels_path.exists():
        return -1, "Unknown"

    with open(labels_path) as f:
        label_map = json.load(f)

    X = df_row[CLUSTERING_FEATURES]
    cluster_id   = int(pipe.predict(X)[0])
    cluster_name = label_map.get(str(cluster_id), "Unknown")
    return cluster_id, cluster_name


def model_exists(user_id: str) -> bool:
    return (MODELS_DIR / f"kmeans_{user_id}.joblib").exists()
