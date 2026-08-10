"""
AgriMind ML – Flask Prediction Micro-service
=============================================
Exposes a single endpoint:

  POST /predict
  Body : { "deviceId": str, "readings": [ SensorReading, ... ] }
  Returns: MlPredictionResponse JSON

The service loads model artefacts from $MODEL_OUTPUT_DIR at startup.
If models are missing it triggers an inline training run (first-boot scenario).
"""
from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
from flask import Flask, jsonify, request

# Ensure src/ is on path when running with gunicorn from /app
sys.path.insert(0, str(Path(__file__).parent))

from features import build_feature_matrix, FEATURE_COLUMNS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("agrimind.api")

app = Flask(__name__)

MODEL_DIR = Path(os.getenv("MODEL_OUTPUT_DIR", "./models"))

# ── Model registry (loaded once at startup) ────────────────────────────────────
_models: Dict[str, Any] = {}
_stress_labels: Dict[str, str] = {}


def load_models() -> None:
    """Load all artefacts into memory. Triggers training if files missing."""
    global _models, _stress_labels

    required = ["model_24h.pkl", "model_48h.pkl", "model_72h.pkl",
                "model_stress.pkl", "feature_columns.json"]
    missing  = [f for f in required if not (MODEL_DIR / f).exists()]

    if missing:
        log.warning(f"Missing model files: {missing}. Running training now…")
        from train import train
        train()

    _models["24h"]    = joblib.load(MODEL_DIR / "model_24h.pkl")
    _models["48h"]    = joblib.load(MODEL_DIR / "model_48h.pkl")
    _models["72h"]    = joblib.load(MODEL_DIR / "model_72h.pkl")
    _models["stress"] = joblib.load(MODEL_DIR / "model_stress.pkl")

    meta = json.loads((MODEL_DIR / "feature_columns.json").read_text())
    _stress_labels = meta["stress_labels"]

    log.info("✅  All models loaded and ready.")


# ── Helper ─────────────────────────────────────────────────────────────────────
def _stress_level_label(level: int) -> str:
    return _stress_labels.get(str(level), "unknown")


def _confidence(model, X_row: np.ndarray) -> float:
    """
    Approximate confidence for regression: use the std of individual tree
    predictions normalised to a 0–1 scale (lower std = higher confidence).
    """
    rf = model.named_steps["rf"]
    scaler = model.named_steps["scaler"]
    X_scaled = scaler.transform(X_row)
    tree_preds = np.array([tree.predict(X_scaled)[0] for tree in rf.estimators_])
    std = float(np.std(tree_preds))
    # Map std 0 → conf 1.0, std 10 → conf 0.0  (clamp)
    confidence = float(np.clip(1.0 - std / 10.0, 0.0, 1.0))
    return round(confidence, 2)


# ── Route ──────────────────────────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON body"}), 400

    device_id: str       = payload.get("deviceId", "unknown")
    readings:  List[Any] = payload.get("readings", [])

    if len(readings) < 6:
        return jsonify({"error": "Need at least 6 readings (3 hours) for prediction"}), 422

    try:
        # Build feature matrix (no target columns needed for inference)
        df = build_feature_matrix(readings, include_targets=False)

        if df.empty:
            return jsonify({"error": "Not enough data after feature engineering"}), 422

        # Use the LAST row (most recent reading) for prediction
        X_last = df[FEATURE_COLUMNS].iloc[[-1]]

        predictions = []
        for hours in [24, 48, 72]:
            key   = f"{hours}h"
            pred  = float(_models[key].predict(X_last)[0])
            pred  = round(max(0.0, min(100.0, pred)), 1)   # clamp to [0, 100]
            conf  = _confidence(_models[key], X_last)
            predictions.append({
                "hoursAhead":   hours,
                "soilMoisture": pred,
                "confidence":   conf,
            })

        # Drought stress classification
        stress_level = int(_models["stress"].predict(X_last)[0])
        stress_label = _stress_level_label(stress_level)

        log.info(
            f"[{device_id}] stress={stress_label} "
            f"pred24h={predictions[0]['soilMoisture']}%"
        )

        return jsonify({
            "deviceId":          device_id,
            "predictions":       predictions,
            "droughtStressLevel": stress_level,
            "droughtStressLabel": stress_label,
        })

    except Exception as exc:
        log.error(f"Prediction error for {device_id}: {exc}", exc_info=True)
        return jsonify({"error": str(exc)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "models_loaded": list(_models.keys())})


# ── Startup ────────────────────────────────────────────────────────────────────
with app.app_context():
    load_models()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
