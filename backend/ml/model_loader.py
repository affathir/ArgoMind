"""
model_loader.py
───────────────
Singleton loader for the ArgoMind XGBoost disease-classifier bundle.

The bundle (.pkl) produced by ml/train.py contains:
    {
        "model":         XGBClassifier (fitted),
        "label_encoder": LabelEncoder  (fitted),
        "feature_cols":  list[str],
    }

Usage
-----
    from ml.model_loader import get_predictor
    result = get_predictor().predict({"soil_moisture": 18.0, "soil_ph": 6.2,
                                       "temperature": 34.5, "humidity": 28.0,
                                       "rainfall_mm": 1.0})
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).resolve().parent
MODELS_DIR  = SCRIPT_DIR.parent / "storage" / "ml" / "models"

# Explicit override — set to a specific filename to pin a version.
# Leave as None to always load the latest available .pkl.
MODEL_VERSION: Optional[str] = None   # e.g. "disease_classifier_v2.pkl"

# ── Risk label → human-readable message ──────────────────────────────────────
LABEL_MESSAGES: Dict[str, str] = {
    "Sehat":          "✅ Kondisi tanah SEHAT. Tidak ada indikasi penyakit saat ini.",
    "Blast":          "⚠️ Risiko BLAST terdeteksi. Periksa daun padi dan pertimbangkan fungisida.",
    "Bercak_Daun":    "⚠️ Risiko BERCAK DAUN terdeteksi. Kurangi kepadatan tanaman dan tingkatkan sirkulasi udara.",
    "Busuk_Akar":     "🚨 Risiko BUSUK AKAR terdeteksi. Perbaiki drainase dan kurangi irigasi segera.",
    "Layu_Fusarium":  "🚨 Risiko LAYU FUSARIUM terdeteksi. Cabut tanaman terinfeksi dan sterilkan media tanam.",
}


class DiseasePredictor:
    """Wraps the XGBoost bundle and exposes a simple predict() interface."""

    def __init__(self, bundle_path: Path) -> None:
        import joblib  # lazy import — keeps startup fast if ML is unused

        bundle = joblib.load(bundle_path)
        self._model         = bundle["model"]
        self._le            = bundle["label_encoder"]
        self._feature_cols  = bundle["feature_cols"]
        self._bundle_path   = bundle_path
        logger.info("Disease predictor loaded from %s", bundle_path.name)

    @property
    def classes(self) -> list[str]:
        return list(self._le.classes_)

    def predict(self, sensor: Dict[str, Any]) -> str:
        """
        Returns a human-readable prediction string.

        Parameters
        ----------
        sensor : dict
            Must contain keys matching self._feature_cols.
            Missing values default to 0.0.
        """
        values = [float(sensor.get(col, 0.0) or 0.0) for col in self._feature_cols]
        X      = np.array([values], dtype=np.float32)

        encoded  = int(self._model.predict(X)[0])
        label    = self._le.inverse_transform([encoded])[0]
        proba    = self._model.predict_proba(X)[0]
        confidence = round(float(proba[encoded]) * 100, 1)

        message = LABEL_MESSAGES.get(label, f"Terdeteksi: {label}")
        return f"{message} (Keyakinan model: {confidence}%)"

    def predict_raw(self, sensor: Dict[str, Any]) -> Dict[str, Any]:
        """Returns the full prediction dict with label, confidence, and all probabilities."""
        values   = [float(sensor.get(col, 0.0) or 0.0) for col in self._feature_cols]
        X        = np.array([values], dtype=np.float32)
        encoded  = int(self._model.predict(X)[0])
        label    = self._le.inverse_transform([encoded])[0]
        proba    = self._model.predict_proba(X)[0]

        return {
            "label":      label,
            "confidence": round(float(proba[encoded]), 4),
            "probabilities": {
                cls: round(float(p), 4)
                for cls, p in zip(self._le.classes_, proba)
            },
            "message": LABEL_MESSAGES.get(label, f"Terdeteksi: {label}"),
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
_predictor: Optional[DiseasePredictor] = None


def _resolve_model_path() -> Optional[Path]:
    """Return the model file path to load, or None if no model exists yet."""
    if MODEL_VERSION:
        path = MODELS_DIR / MODEL_VERSION
        return path if path.exists() else None

    # Auto-pick the highest version number
    candidates = sorted(MODELS_DIR.glob("disease_classifier_v*.pkl"))
    return candidates[-1] if candidates else None


def get_predictor() -> Optional[DiseasePredictor]:
    """
    Return the singleton DiseasePredictor, loading it on first call.
    Returns None (graceful degradation) if no trained model file is found.
    """
    global _predictor
    if _predictor is not None:
        return _predictor

    path = _resolve_model_path()
    if path is None:
        logger.warning(
            "No trained model found in %s — disease prediction disabled. "
            "Run: python -m ml.train --gen",
            MODELS_DIR,
        )
        return None

    _predictor = DiseasePredictor(path)
    return _predictor
