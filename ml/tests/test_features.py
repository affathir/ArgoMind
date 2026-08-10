"""
AgriMind ML – Unit tests
=========================
Run with:  pytest ml/tests/ -v
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import List, Dict

import numpy as np
import pandas as pd
import pytest

# Ensure src/ is importable
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from features import (
    build_feature_matrix,
    FEATURE_COLUMNS,
    readings_to_dataframe,
    add_lag_features,
    add_rolling_features,
    add_time_features,
    add_derivative_features,
)


# ── Fixtures ───────────────────────────────────────────────────────────────────

def make_readings(n: int = 50) -> List[Dict]:
    """Generate n synthetic 30-min readings."""
    rng = np.random.default_rng(0)
    timestamps = pd.date_range("2024-01-01", periods=n, freq="30min")
    return [
        {
            "timestamp":       str(ts),
            "soilMoisture":    float(rng.uniform(15, 70)),
            "soilTemperature": float(rng.uniform(20, 30)),
            "airTemperature":  float(rng.uniform(25, 35)),
            "airHumidity":     float(rng.uniform(50, 80)),
        }
        for ts in timestamps
    ]


# ── Feature engineering tests ─────────────────────────────────────────────────

class TestReadingsToDataFrame:
    def test_sorted_by_timestamp(self):
        readings = make_readings(10)
        # Shuffle deliberately
        shuffled = readings[5:] + readings[:5]
        df = readings_to_dataframe(shuffled)
        assert df["timestamp"].is_monotonic_increasing

    def test_correct_row_count(self):
        readings = make_readings(20)
        df = readings_to_dataframe(readings)
        assert len(df) == 20


class TestLagFeatures:
    def test_lag_columns_present(self):
        df = readings_to_dataframe(make_readings(20))
        df = add_lag_features(df)
        for i in range(1, 7):
            assert f"soil_moisture_lag_{i}" in df.columns

    def test_lag_1_equals_shifted_moisture(self):
        df = readings_to_dataframe(make_readings(20))
        df = add_lag_features(df)
        # Row index 5: lag_1 should equal row 4's soilMoisture
        assert df.loc[5, "soil_moisture_lag_1"] == pytest.approx(df.loc[4, "soilMoisture"])


class TestRollingFeatures:
    def test_rolling_columns_present(self):
        df = readings_to_dataframe(make_readings(20))
        df = add_rolling_features(df)
        for label in ["2h", "6h"]:
            for stat in ["mean", "std", "min", "max"]:
                assert f"soil_moisture_{stat}_{label}" in df.columns

    def test_mean_within_bounds(self):
        readings = make_readings(30)
        df = readings_to_dataframe(readings)
        df = add_rolling_features(df)
        assert (df["soil_moisture_mean_2h"] >= 0).all()
        assert (df["soil_moisture_mean_2h"] <= 100).all()


class TestTimeFeatures:
    def test_sin_cos_range(self):
        df = readings_to_dataframe(make_readings(10))
        df = add_time_features(df)
        for col in ["hour_sin", "hour_cos", "dow_sin", "dow_cos"]:
            assert (df[col] >= -1.0).all() and (df[col] <= 1.0).all()


class TestBuildFeatureMatrix:
    def test_all_feature_columns_present(self):
        readings = make_readings(50)
        df = build_feature_matrix(readings, include_targets=False)
        for col in FEATURE_COLUMNS:
            assert col in df.columns, f"Missing column: {col}"

    def test_no_nans_in_features(self):
        readings = make_readings(50)
        df = build_feature_matrix(readings, include_targets=False)
        assert not df[FEATURE_COLUMNS].isnull().any().any()

    def test_target_columns_when_requested(self):
        readings = make_readings(200)
        df = build_feature_matrix(readings, include_targets=True)
        for h in [24, 48, 72]:
            assert f"target_{h}h" in df.columns

    def test_minimum_readings_required(self):
        # With fewer than lag_steps readings, output should still be a DataFrame
        readings = make_readings(3)
        df = build_feature_matrix(readings, include_targets=False)
        assert isinstance(df, pd.DataFrame)


# ── Moisture → stress label ────────────────────────────────────────────────────

class TestMoistureToStress:
    def test_stress_levels(self):
        from train import moisture_to_stress
        assert moisture_to_stress(50) == 0   # healthy
        assert moisture_to_stress(35) == 1   # watch
        assert moisture_to_stress(18) == 2   # alert
        assert moisture_to_stress(5)  == 3   # critical
        assert moisture_to_stress(40) == 0   # boundary: exactly 40 = healthy
        assert moisture_to_stress(25) == 1   # boundary: exactly 25 = watch
