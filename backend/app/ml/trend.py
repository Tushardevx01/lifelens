"""
ARIMA Time-Series Trend Prediction for LifeLens AI.

Forecasts 7-day ahead trends for sleep_score, productivity_score, life_score.
Uses ARIMA(1,1,1) — suitable for daily behavioral series (30+ data points).
Upgrades to LSTM in Phase 3 (90+ days).
"""

import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller


TREND_METRICS = ['sleep_score', 'productivity_score', 'life_score']
MIN_DATA_FOR_ARIMA = 30
FORECAST_DAYS = 7


def check_stationarity(series: pd.Series) -> bool:
    """ADF test: p < 0.05 → stationary."""
    try:
        result = adfuller(series.dropna())
        return bool(result[1] < 0.05)
    except Exception:
        return False


def fit_arima(series: pd.Series, forecast_days: int = FORECAST_DAYS) -> dict:
    """
    Fit ARIMA(1,1,1) on a time series.
    Returns 7-day forecast, confidence intervals, slope, and trend direction.
    """
    series = series.dropna()

    if len(series) < MIN_DATA_FOR_ARIMA:
        return {
            'error': f'Need {MIN_DATA_FOR_ARIMA} data points. Got {len(series)}.',
            'trend_direction': 'stable',
        }

    try:
        model  = ARIMA(series, order=(1, 1, 1))
        result = model.fit()

        forecast    = result.forecast(steps=forecast_days)
        conf_int    = result.get_forecast(steps=forecast_days).conf_int(alpha=0.2)

        slope = float((forecast.iloc[-1] - forecast.iloc[0]) / forecast_days)

        trend_direction = (
            'declining'  if slope < -0.5 else
            'improving'  if slope > 0.5  else
            'stable'
        )

        return {
            'forecast':        [round(float(v), 2) for v in forecast.tolist()],
            'conf_lower':      [round(float(v), 2) for v in conf_int.iloc[:, 0].tolist()],
            'conf_upper':      [round(float(v), 2) for v in conf_int.iloc[:, 1].tolist()],
            'slope_per_day':   round(slope, 4),
            'trend_direction': trend_direction,
            'aic':             round(float(result.aic), 2),
        }
    except Exception as e:
        return {'error': str(e), 'trend_direction': 'stable'}


def run_all_trend_forecasts(df: pd.DataFrame) -> dict:
    """Run ARIMA for each tracked metric. Returns dict keyed by metric name."""
    results: dict = {}
    for metric in TREND_METRICS:
        if metric in df.columns:
            results[metric] = fit_arima(df[metric])
    return results


def detect_burnout_risk(
    sleep_trend: dict,
    productivity_trend: dict,
) -> dict:
    """
    Burnout risk = both sleep AND productivity are declining simultaneously.
    Risk level: HIGH if sleep slope < -1.5, else MEDIUM.
    """
    sleep_declining       = sleep_trend.get('trend_direction') == 'declining'
    productivity_declining = productivity_trend.get('trend_direction') == 'declining'

    if sleep_declining and productivity_declining:
        sleep_slope = abs(float(sleep_trend.get('slope_per_day', 0)))
        risk_level  = 'HIGH' if sleep_slope > 1.5 else 'MEDIUM'
        return {
            'burnout_risk': True,
            'risk_level':   risk_level,
            'message': (
                f"Both sleep and productivity have been declining. "
                f"Burnout risk is {risk_level}. Consider taking a rest day."
            ),
        }
    return {'burnout_risk': False, 'risk_level': 'LOW'}
