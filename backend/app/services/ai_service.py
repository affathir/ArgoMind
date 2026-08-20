"""
AI Service — ML inference + LLM advice.

ML layer  : XGBoost disease classifier loaded via ml/model_loader.py
LLM layer : LangChain RAG pipeline (FAISS + Google Gemini)
"""
from __future__ import annotations

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


# ── ML: Disease Prediction ────────────────────────────────────────────────────

def predict_disease(sensor_payload: Dict[str, Any]) -> str:
    """
    Predict crop disease risk from sensor readings using the trained XGBoost model.

    Expected sensor_payload keys:
        soil_moisture (%), soil_ph, temperature (°C), humidity (%), rainfall_mm

    Falls back to a safe static message if no trained model is found.
    """
    try:
        from ml.model_loader import get_predictor  # lazy — avoids hard dep at import time

        predictor = get_predictor()
        if predictor is None:
            return (
                "⚙️ Model ML belum tersedia. "
                "Jalankan: python -m ml.train --gen  untuk melatih model."
            )
        return predictor.predict(sensor_payload)

    except Exception as exc:
        logger.error("ML prediction failed: %s", exc, exc_info=True)
        return f"⚠️ Prediksi gagal: {exc}"


# ── LLM: Natural-Language Advice via LangChain RAG ───────────────────────────

def get_llm_advice(context: Dict[str, Any]) -> str:
    """
    Memanggil LangChain RAG+LLM pipeline untuk menghasilkan saran pertanian
    dalam Bahasa Indonesia berdasarkan context sensor + cuaca + prediksi ML.

    Jika GOOGLE_API_KEY belum diset di .env, fungsi ini akan mengembalikan
    saran statis yang context-aware sebagai fallback.

    Expected context keys:
        farm_id, crop_type, soil_moisture, soil_ph,
        temperature, humidity, rainfall_mm, sunlight_hours,
        ml_disease_prediction
    """
    from app.config import get_settings
    settings = get_settings()

    # --- Jika Google API Key tersedia, gunakan LangChain RAG+LLM ---
    if getattr(settings, "GOOGLE_API_KEY", ""):
        from app.services.langchain_service import call_langchain
        return call_langchain(context)

    # --- Fallback: saran statis context-aware ---
    moisture    = context.get("soil_moisture")
    temperature = context.get("temperature")
    rainfall    = context.get("rainfall_mm")
    crop        = context.get("crop_type") or "tanaman Anda"

    advice_parts: list[str] = [f"Berdasarkan data sensor terkini untuk {crop}:"]

    if moisture is not None and moisture < 25:
        advice_parts.append(
            "• Kelembapan tanah sangat rendah — segera lakukan irigasi untuk mencegah stres kekeringan."
        )
    elif moisture is not None and moisture > 75:
        advice_parts.append(
            "• Kelembapan tanah terlalu tinggi — pastikan saluran drainase tidak tersumbat."
        )
    else:
        advice_parts.append("• Kelembapan tanah dalam kondisi normal.")

    if temperature is not None and temperature > 35:
        advice_parts.append(
            "• Suhu udara tinggi — pertimbangkan mulsa untuk menjaga suhu tanah tetap stabil."
        )

    if rainfall is not None and rainfall > 15:
        advice_parts.append(
            "• Curah hujan tinggi diprediksi hari ini — tunda pemupukan untuk menghindari pencucian nutrisi."
        )

    advice_parts.append(
        "\n[LLM tidak aktif] Isi GOOGLE_API_KEY di .env untuk mengaktifkan "
        "saran AI berbasis RAG+LLM dari farming_knowledge_base.txt."
    )
    return "\n".join(advice_parts)
