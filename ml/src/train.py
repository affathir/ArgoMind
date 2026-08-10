"""
AgriMind ML – Training pipeline
================================
Trains one RandomForestRegressor per forecast horizon (24h, 48h, 72h).
Also trains a drought-stress classifier (0–3).

Usage
-----
    python src/train.py                    # use synthetic data if no CSV found
    python src/train.py --data data/raw/readings.csv

Model artefacts saved to $MODEL_OUTPUT_DIR (default: ./models/):
    model_24h.pkl
    model_48h.pkl
    model_72h.pkl
    model_stress.pkl
    feature_columns.json
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Dict

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from features import build_feature_matrix, FEATURE_COLUMNS, HORIZON_STEPS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("agrimind.train")

MODEL_DIR = Path(os.getenv("MODEL_OUTPUT_DIR", "./models"))
MODEL_DIR.mkdir(parents=True, exist_ok=True)


# ── Drought stress label ───────────────────────────────────────────────────────
def moisture_to_stress(pct: float) -> int:
    """Map soil moisture % → stress level 0–3."""
    if pct >= 40:   return 0   # healthy
    if pct >= 25:   return 1   # watch
    if pct >= 12:   return 2   # alert
    return 3                   # critical


STRESS_LABELS = {0: "healthy", 1: "watch", 2: "alert", 3: "critical"}


# ── Synthetic data generator (fallback when no CSV available) ──────────────────
def generate_synthetic_data(n_days: int = 60) -> List[Dict]:
    """
    Generates synthetic 30-min sensor readings for training.
    Simulates a typical dry-down cycle + irrigation event.
    """
    rng   = np.random.default_rng(42)
    steps = n_days * 48     # 30-min intervals
    now   = pd.Timestamp.now().normalize()
    timestamps = pd.date_range(end=now, periods=steps, freq="30min")

    # Base moisture: slow sinusoidal drift + random noise + occasional irrigation
    moisture = np.zeros(steps)
    moisture[0] = 60.0
    for i in range(1, steps):
        # Evapotranspiration: slow drain
        drain = 0.15 + rng.uniform(0, 0.05)
        # Rain / irrigation event every ~4 days
        refill = 18.0 if (i % 192 == 0) else 0.0
        moisture[i] = np.clip(moisture[i - 1] - drain + refill + rng.normal(0, 0.3), 5, 95)

    records = []
    for i, ts in enumerate(timestamps):
        records.append({
            "timestamp":       ts.isoformat(),
            "soilMoisture":    round(float(moisture[i]), 2),
            "soilTemperature": round(float(24 + rng.normal(0, 1.5)), 2),
            "airTemperature":  round(float(28 + 4 * np.sin(2 * np.pi * ts.hour / 24) + rng.normal(0, 1)), 2),
            "airHumidity":     round(float(65 - 10 * np.sin(2 * np.pi * ts.hour / 24) + rng.normal(0, 3)), 2),
        })
    return records


# ── Training ───────────────────────────────────────────────────────────────────
def train(data_path: str | None = None) -> None:
    # 1. Load data
    if data_path and Path(data_path).exists():
        log.info(f"Loading data from {data_path}")
        raw_df = pd.read_csv(data_path)
        readings = raw_df.to_dict(orient="records")
    else:
        log.info("No CSV found — using synthetic data for training")
        readings = generate_synthetic_data(n_days=90)

    # 2. Feature engineering
    df = build_feature_matrix(readings, include_targets=True)
    log.info(f"Feature matrix shape: {df.shape}")

    X = df[FEATURE_COLUMNS]

    # 3. Train one regressor per horizon
    for hours in HORIZON_STEPS:
        target_col = f"target_{hours}h"
        mask = df[target_col].notna()
        X_h = X[mask]
        y_h = df.loc[mask, target_col]

        X_train, X_test, y_train, y_test = train_test_split(
            X_h, y_h, test_size=0.15, shuffle=False
        )

        pipe = Pipeline([
            ("scaler", StandardScaler()),
            ("rf",     RandomForestRegressor(
                n_estimators=150,
                max_depth=12,
                min_samples_leaf=3,
                n_jobs=-1,
                random_state=42,
            )),
        ])
        pipe.fit(X_train, y_train)

        mae = mean_absolute_error(y_test, pipe.predict(X_test))
        log.info(f"Regressor +{hours}h — MAE: {mae:.2f}%  (test n={len(X_test)})")

        out_path = MODEL_DIR / f"model_{hours}h.pkl"
        joblib.dump(pipe, out_path)
        log.info(f"Saved → {out_path}")

    # 4. Train drought stress classifier
    stress_labels = df["soilMoisture"].apply(moisture_to_stress)
    X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(
        X, stress_labels, test_size=0.15, shuffle=False
    )

    stress_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("rf",     RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            n_jobs=-1,
            random_state=42,
        )),
    ])
    stress_pipe.fit(X_train_s, y_train_s)
    acc = accuracy_score(y_test_s, stress_pipe.predict(X_test_s))
    log.info(f"Stress classifier — Accuracy: {acc:.2%}  (test n={len(X_test_s)})")

    out_path = MODEL_DIR / "model_stress.pkl"
    joblib.dump(stress_pipe, out_path)
    log.info(f"Saved → {out_path}")

    # 5. Persist feature column list so the API can validate inputs
    meta = {
        "feature_columns": FEATURE_COLUMNS,
        "stress_labels":   STRESS_LABELS,
        "horizons_h":      list(HORIZON_STEPS.keys()),
    }
    meta_path = MODEL_DIR / "feature_columns.json"
    meta_path.write_text(json.dumps(meta, indent=2))
    log.info(f"Saved metadata → {meta_path}")

    log.info("✅  Training complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgriMind ML training pipeline")
    parser.add_argument("--data", type=str, default=None, help="Path to CSV file")
    args = parser.parse_args()
    train(args.data)
