"""
langflow_service.py
-------------------
Koneksi ArgoMind backend ke Langflow API (RAG + LLM flow).

CARA MENGAKTIFKAN:
1. Import flow ke Langflow UI:
       Langflow UI -> My Flows -> Import -> pilih argomind_langflow_flow.json
2. Upload knowledge base:
       Di node "File" pada flow -> upload farming_knowledge_base.txt
3. Isi variabel di .env:
       LANGFLOW_API_URL = http://localhost:7860
       LANGFLOW_FLOW_ID = <uuid-dari-url-langflow-setelah-import>
       LANGFLOW_API_KEY = <token-opsional>
4. Di ai_service.py, ganti get_llm_advice() dengan:
       from app.services.langflow_service import call_langflow
       return call_langflow(context)
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict

import httpx

from app.config import get_settings, LLM_RESPONSES_DIR

logger   = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_input_value(ctx: Dict[str, Any]) -> str:
    """
    Serialisasi context menjadi string terstruktur sebagai input_value.
    String ini juga digunakan Chroma untuk semantic search (RAG query).
    """
    parts = [
        f"farm_id={ctx.get('farm_id', 'N/A')}",
        f"crop_type={ctx.get('crop_type') or 'tidak diketahui'}",
        f"soil_moisture={ctx.get('soil_moisture', 'N/A')}%",
        f"soil_ph={ctx.get('soil_ph', 'N/A')}",
        f"temperature={ctx.get('temperature', 'N/A')}C",
        f"humidity={ctx.get('humidity', 'N/A')}%",
        f"rainfall_mm={ctx.get('rainfall_mm', 'N/A')} mm",
        f"sunlight_hours={ctx.get('sunlight_hours', 'N/A')} jam",
        f"ml_disease_prediction={ctx.get('ml_disease_prediction', 'belum tersedia')}",
    ]
    return " | ".join(parts)


def _build_tweaks(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inject nilai context langsung ke node PromptTemplate melalui 'tweaks'.
    Sesuaikan node ID jika kamu rename node di Langflow UI.
    """
    return {
        "Prompt-001": {
            "farm_id":               str(ctx.get("farm_id", "")),
            "crop_type":             str(ctx.get("crop_type") or "tidak diketahui"),
            "soil_moisture":         str(ctx.get("soil_moisture", 0.0)),
            "soil_ph":               str(ctx.get("soil_ph", 0.0)),
            "temperature":           str(ctx.get("temperature", 0.0)),
            "humidity":              str(ctx.get("humidity", 0.0)),
            "rainfall_mm":           str(ctx.get("rainfall_mm", 0.0)),
            "sunlight_hours":        str(ctx.get("sunlight_hours", 0.0)),
            "ml_disease_prediction": str(ctx.get("ml_disease_prediction", "")),
        },
        "Chroma-001": {
            "number_of_results": 4,
        },
        "ChatOpenAI-001": {
            "temperature": 0.3,
            "max_tokens":  600,
        },
    }


# ---------------------------------------------------------------------------
# Core: panggil Langflow
# ---------------------------------------------------------------------------

def call_langflow(context: Dict[str, Any]) -> str:
    """
    Panggil Langflow RAG+LLM flow dan kembalikan teks saran pertanian.

    Variabel .env:
        LANGFLOW_API_URL  - URL Langflow server
        LANGFLOW_FLOW_ID  - UUID flow (lihat URL setelah import di Langflow UI)
        LANGFLOW_API_KEY  - API key Langflow (opsional)
    """
    api_url = getattr(settings, "LANGFLOW_API_URL", "http://localhost:7860")
    flow_id = getattr(settings, "LANGFLOW_FLOW_ID", "")
    api_key = getattr(settings, "LANGFLOW_API_KEY", "")

    if not flow_id:
        logger.warning("LANGFLOW_FLOW_ID belum diset di .env")
        return (
            "[LLM tidak aktif] Isi LANGFLOW_FLOW_ID di .env "
            "untuk mengaktifkan saran AI berbasis RAG+LLM."
        )

    endpoint = f"{api_url.rstrip('/')}/api/v1/run/{flow_id}"
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["x-api-key"] = api_key

    payload: Dict[str, Any] = {
        "input_value": _build_input_value(context),
        "input_type":  "chat",
        "output_type": "chat",
        "session_id":  str(context.get("farm_id", "argomind")),
        "tweaks":      _build_tweaks(context),
    }

    try:
        logger.info("Calling Langflow flow %s for farm %s", flow_id[:8], context.get("farm_id"))
        resp = httpx.post(endpoint, json=payload, headers=headers, timeout=45)
        resp.raise_for_status()
        data = resp.json()

        advice: str = data["outputs"][0]["outputs"][0]["results"]["message"]["text"]

        _save_to_disk(context.get("farm_id", "unknown"), payload, data)
        logger.info("LLM advice received (%d chars) for farm %s", len(advice), context.get("farm_id"))
        return advice

    except httpx.TimeoutException:
        logger.error("Langflow timeout (45s) — farm %s", context.get("farm_id"))
        return "[LLM timeout] Langflow tidak merespons. Coba lagi dalam beberapa menit."

    except httpx.HTTPStatusError as exc:
        logger.error("Langflow HTTP %s — %s", exc.response.status_code, exc.response.text[:300])
        return (
            f"[LLM error {exc.response.status_code}] "
            "Langflow mengembalikan error. Periksa API key dan Flow ID."
        )

    except (KeyError, IndexError) as exc:
        logger.error("Langflow response structure unexpected: %s", exc)
        return "[LLM parse error] Format respons Langflow tidak dikenali. Periksa versi Langflow."

    except Exception as exc:
        logger.error("Langflow call failed: %s", exc, exc_info=True)
        return f"[LLM error] {exc}"


# ---------------------------------------------------------------------------
# Persist raw response to disk
# ---------------------------------------------------------------------------

def _save_to_disk(
    farm_id: str,
    request_payload: Dict[str, Any],
    response_data:   Dict[str, Any],
) -> None:
    try:
        ts   = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe = farm_id.replace("/", "_").replace("\\", "_")
        path = LLM_RESPONSES_DIR / f"{safe}_{ts}.json"

        record = {
            "farm_id":   farm_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request":   request_payload,
            "response":  response_data,
        }
        path.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.debug("LLM response saved: %s", path.name)
    except Exception as exc:
        logger.warning("Could not save LLM response: %s", exc)
