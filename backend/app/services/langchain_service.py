"""
langchain_service.py
--------------------
ArgoMind RAG + LLM pipeline menggunakan LangChain.

Arsitektur:
    farming_knowledge_base.txt (+ kb_*.txt)
        │
        ▼  RecursiveCharacterTextSplitter
    chunks  ──► FAISS (in-memory vector store, di-embed sekali lalu di-cache)
        │
        ▼  similarity_search
    retrieved docs  ──► PromptTemplate + GoogleGenerativeAI (Gemini)
        │
        ▼
    saran pertanian (Bahasa Indonesia)

Konfigurasi .env yang dibutuhkan:
    GOOGLE_API_KEY  - Gemini API key (https://aistudio.google.com/app/apikey)
    LANGCHAIN_MODEL - (opsional) nama model Gemini, default: gemini-1.5-flash
    LANGCHAIN_TEMPERATURE - (opsional) 0.0-1.0, default: 0.3
"""
from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import get_settings, LLM_RESPONSES_DIR

logger   = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Paths to knowledge-base files
# ---------------------------------------------------------------------------

_KB_DIR = LLM_RESPONSES_DIR   # backend/storage/llm_responses/

_KB_FILES: List[str] = [
    "farming_knowledge_base.txt",
    "kb_general.txt",
    "kb_rice.txt",
    "kb_corn.txt",
    "kb_chili.txt",
    "kb_tomato.txt",
    "kb_potato.txt",
    "kb_melon_watermelon.txt",
    "kb_beans_soybean.txt",
    "kb_irrigation_weather_soil.txt",
]


# ---------------------------------------------------------------------------
# Vector store — built once, cached in-process
# ---------------------------------------------------------------------------

_vs_lock   = threading.Lock()
_vector_store: Optional[Any] = None   # FAISS instance


def _load_kb_texts() -> str:
    """
    Gabungkan semua file knowledge-base menjadi satu string.
    File yang tidak ditemukan akan dilewati.
    """
    parts: List[str] = []
    for fname in _KB_FILES:
        path = _KB_DIR / fname
        if path.exists():
            parts.append(path.read_text(encoding="utf-8"))
            logger.debug("KB loaded: %s", fname)
        else:
            logger.debug("KB file not found, skipped: %s", fname)
    if not parts:
        raise FileNotFoundError(
            f"Tidak ada file knowledge-base ditemukan di {_KB_DIR}. "
            "Pastikan farming_knowledge_base.txt atau kb_*.txt tersedia."
        )
    return "\n\n".join(parts)


def _build_vector_store() -> Any:
    """
    Buat FAISS vector store dari knowledge-base texts.
    Hanya dipanggil sekali; hasilnya di-cache di `_vector_store`.
    """
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import FAISS
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    api_key = settings.GOOGLE_API_KEY
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY belum diset di .env. "
            "Dapatkan API key gratis dari https://aistudio.google.com/app/apikey"
        )

    raw_text = _load_kb_texts()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n---\n", "\n\n", "\n", " "],
    )
    chunks = splitter.create_documents([raw_text])
    logger.info("Knowledge base: %d chunks siap untuk di-embed", len(chunks))

    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=api_key,
    )
    vs = FAISS.from_documents(chunks, embeddings)
    logger.info("FAISS vector store berhasil dibangun (%d docs)", vs.index.ntotal)
    return vs


def _get_vector_store() -> Any:
    """
    Kembalikan singleton FAISS vector store.
    Thread-safe: dibangun sekali lalu di-cache.
    """
    global _vector_store
    if _vector_store is None:
        with _vs_lock:
            if _vector_store is None:   # double-checked locking
                _vector_store = _build_vector_store()
    return _vector_store


# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

_PROMPT_TEMPLATE = """\
Kamu adalah ArgoMind, asisten pertanian cerdas berbasis AI.
Tugasmu adalah memberikan saran pertanian yang praktis, spesifik, dan dapat langsung ditindaklanjuti
dalam Bahasa Indonesia kepada petani berdasarkan data sensor IoT dan prediksi ML.

---
DATA SENSOR DAN KONDISI FARM SAAT INI:
- Farm ID      : {farm_id}
- Jenis Tanaman: {crop_type}
- Kelembapan Tanah: {soil_moisture}%
- pH Tanah     : {soil_ph}
- Suhu Udara   : {temperature}°C
- Kelembapan Udara: {humidity}%
- Curah Hujan Hari Ini: {rainfall_mm} mm
- Jam Sinar Matahari  : {sunlight_hours} jam
- Prediksi Penyakit ML: {ml_disease_prediction}

---
PENGETAHUAN RELEVAN DARI BASIS DATA PERTANIAN:
{retrieved_context}

---
Berdasarkan data di atas dan pengetahuan yang diberikan, berikan saran pertanian yang:
1. Spesifik terhadap kondisi sensor saat ini
2. Fokus pada tindakan yang harus segera dilakukan (jika ada kondisi kritis)
3. Mencakup rekomendasi pemupukan, irigasi, atau pengendalian hama jika relevan
4. Menggunakan bahasa yang mudah dipahami petani
5. Singkat namun padat informasi (maksimal 300 kata)

Saran:
"""


# ---------------------------------------------------------------------------
# Core: RAG + LLM
# ---------------------------------------------------------------------------

def call_langchain(context: Dict[str, Any]) -> str:
    """
    Jalankan RAG + LLM pipeline menggunakan LangChain dan kembalikan
    saran pertanian dalam Bahasa Indonesia.

    Variabel .env:
        GOOGLE_API_KEY       - wajib
        LANGCHAIN_MODEL      - opsional, default gemini-1.5-flash
        LANGCHAIN_TEMPERATURE - opsional, default 0.3
    """
    api_key     = settings.GOOGLE_API_KEY
    model_name  = getattr(settings, "LANGCHAIN_MODEL", "gemini-1.5-flash")
    temperature = float(getattr(settings, "LANGCHAIN_TEMPERATURE", 0.3))

    if not api_key:
        return (
            "[LLM tidak aktif] Isi GOOGLE_API_KEY di .env "
            "untuk mengaktifkan saran AI berbasis RAG+LLM."
        )

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.prompts import PromptTemplate

        # ── Retrieval ──────────────────────────────────────────────────────
        query = _build_retrieval_query(context)
        vs    = _get_vector_store()
        docs  = vs.similarity_search(query, k=4)
        retrieved_context = "\n\n".join(d.page_content for d in docs)

        # ── Prompt ────────────────────────────────────────────────────────
        prompt = PromptTemplate.from_template(_PROMPT_TEMPLATE)
        filled = prompt.format(
            farm_id               = str(context.get("farm_id", "N/A")),
            crop_type             = str(context.get("crop_type") or "tidak diketahui"),
            soil_moisture         = _fmt(context.get("soil_moisture")),
            soil_ph               = _fmt(context.get("soil_ph")),
            temperature           = _fmt(context.get("temperature")),
            humidity              = _fmt(context.get("humidity")),
            rainfall_mm           = _fmt(context.get("rainfall_mm")),
            sunlight_hours        = _fmt(context.get("sunlight_hours")),
            ml_disease_prediction = str(context.get("ml_disease_prediction") or "belum tersedia"),
            retrieved_context     = retrieved_context,
        )

        # ── LLM ───────────────────────────────────────────────────────────
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=temperature,
            max_output_tokens=600,
        )
        logger.info(
            "Calling Gemini (%s) for farm %s via LangChain",
            model_name, context.get("farm_id"),
        )
        response = llm.invoke(filled)
        advice   = response.content.strip()

        _save_to_disk(context, retrieved_context, advice)
        logger.info(
            "LLM advice received (%d chars) for farm %s",
            len(advice), context.get("farm_id"),
        )
        return advice

    except ImportError as exc:
        logger.error("LangChain packages missing: %s", exc)
        return (
            "[LLM error] Package LangChain belum terinstall. "
            "Jalankan: pip install -r requirements.txt"
        )
    except Exception as exc:
        logger.error("LangChain call failed: %s", exc, exc_info=True)
        return f"[LLM error] {exc}"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_retrieval_query(ctx: Dict[str, Any]) -> str:
    """Buat query string untuk similarity search berdasarkan context farm."""
    crop    = ctx.get("crop_type") or "tanaman"
    disease = ctx.get("ml_disease_prediction") or ""
    parts   = [f"penyakit dan saran pertanian untuk {crop}"]
    if disease and disease not in ("belum tersedia", "N/A"):
        parts.append(disease)
    parts += [
        f"kelembapan tanah {_fmt(ctx.get('soil_moisture'))}%",
        f"suhu {_fmt(ctx.get('temperature'))}C",
        f"ph tanah {_fmt(ctx.get('soil_ph'))}",
    ]
    return " ".join(parts)


def _fmt(val: Any) -> str:
    """Format nilai numerik; kembalikan 'N/A' jika None."""
    if val is None:
        return "N/A"
    if isinstance(val, float):
        return f"{val:.1f}"
    return str(val)


def _save_to_disk(
    context: Dict[str, Any],
    retrieved_context: str,
    advice: str,
) -> None:
    try:
        farm_id = str(context.get("farm_id", "unknown"))
        ts      = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe    = farm_id.replace("/", "_").replace("\\", "_")
        path    = LLM_RESPONSES_DIR / f"{safe}_{ts}.json"

        record = {
            "farm_id":          farm_id,
            "timestamp":        datetime.now(timezone.utc).isoformat(),
            "context":          context,
            "retrieved_context": retrieved_context,
            "advice":           advice,
        }
        path.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.debug("LLM response saved: %s", path.name)
    except Exception as exc:
        logger.warning("Could not save LLM response: %s", exc)
