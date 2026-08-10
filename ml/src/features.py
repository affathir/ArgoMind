"""
AgriMind ML – Feature engineering pipeline
===========================================
Input  : list of raw sensor readings (dicts with timestamp + sensor fields)
Output : pandas DataFrame with lag features + rolling stats + time cyclicals

Features generated per row
---------------------------
  Lag features (t-1 … t-6, 30-min steps → last 3 h):
    soil_moisture_lag_1 … _6

  Rolling window statistics (1 h = 2 samples, 3 h = 6 samples):
    soil_moisture_mean_2h, _std_2h, _min_2h, _max_2h
    soil_moisture_mean_6h, _std_6h, _min_6h, _max_6h

  Derivative (rate of change):
    moisture_delta_1h     = moisture_now - moisture_1h_ago

  Environmental:
    soil_temperature, air_temperature, air_humidity

  Time cyclicals (sin/cos encoding → avoids discontinuity at midnight):
    hour_sin, hour_cos
    dow_sin,  dow_cos   (day of week)

Target
------
  soil_moisture_future_Nh  where N ∈ {24, 48, 72}
  (stored as separate columns in the training DataFrame)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from typing import List, Dict, Any


# Steps per horizon (30-min intervals)
HORIZON_STEPS = {24: 48, 48: 96, 72: 144}

# Lag steps to generate
LAG_STEPS = list(range(1, 7))   # 1 … 6  (30 min … 3 h)

# Rolling window sizes (in samples)
ROLLING_WINDOWS = {"2h": 4, "6h": 12}


def readings_to_dataframe(readings: List[Dict[str, Any]]) -> pd.DataFrame:
    """Convert raw reading dicts → sorted DataFrame."""
    df = pd.DataFrame(readings)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Encode hour-of-day and day-of-week as sin/cos pairs."""
    df = df.copy()
    hour = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60
    dow  = df["timestamp"].dt.dayofweek

    df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24)
    df["dow_sin"]  = np.sin(2 * np.pi * dow  / 7)
    df["dow_cos"]  = np.cos(2 * np.pi * dow  / 7)
    return df


def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lagged soil moisture columns."""
    df = df.copy()
    for lag in LAG_STEPS:
        df[f"soil_moisture_lag_{lag}"] = df["soilMoisture"].shift(lag)
    return df


def add_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling mean / std / min / max for each window size."""
    df = df.copy()
    for label, window in ROLLING_WINDOWS.items():
        roll = df["soilMoisture"].rolling(window=window, min_periods=1)
        df[f"soil_moisture_mean_{label}"] = roll.mean()
        df[f"soil_moisture_std_{label}"]  = roll.std().fillna(0)
        df[f"soil_moisture_min_{label}"]  = roll.min()
        df[f"soil_moisture_max_{label}"]  = roll.max()
    return df


def add_derivative_features(df: pd.DataFrame) -> pd.DataFrame:
    """Rate of change: moisture now vs 2 steps (1 h) ago."""
    df = df.copy()
    df["moisture_delta_1h"] = df["soilMoisture"] - df["soilMoisture"].shift(2)
    return df


def add_target_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    For training only: shift moisture forward by N steps to create future targets.
    Rows near the end of the series will have NaN targets (dropped during training).
    """
    df = df.copy()
    for hours, steps in HORIZON_STEPS.items():
        df[f"target_{hours}h"] = df["soilMoisture"].shift(-steps)
    return df


def build_feature_matrix(
    readings: List[Dict[str, Any]],
    include_targets: bool = False,
) -> pd.DataFrame:
    """
    Full feature pipeline.

    Parameters
    ----------
    readings       : list of raw sensor reading dicts
    include_targets: True during training, False during inference

    Returns
    -------
    df             : DataFrame ready for model.fit() or model.predict()
    """
    df = readings_to_dataframe(readings)
    df = add_time_features(df)
    df = add_lag_features(df)
    df = add_rolling_features(df)
    df = add_derivative_features(df)

    if include_targets:
        df = add_target_columns(df)

    # Drop rows with NaN (from lags at the start of the series)
    df = df.dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)

    return df


# Ordered list of feature column names used by the model
FEATURE_COLUMNS: List[str] = (
    ["soilMoisture", "soilTemperature", "airTemperature", "airHumidity"]
    + [f"soil_moisture_lag_{i}" for i in LAG_STEPS]
    + [f"soil_moisture_mean_{w}" for w in ROLLING_WINDOWS]
    + [f"soil_moisture_std_{w}"  for w in ROLLING_WINDOWS]
    + [f"soil_moisture_min_{w}"  for w in ROLLING_WINDOWS]
    + [f"soil_moisture_max_{w}"  for w in ROLLING_WINDOWS]
    + ["moisture_delta_1h", "hour_sin", "hour_cos", "dow_sin", "dow_cos"]
)
