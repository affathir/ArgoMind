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
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import get_settings, LLM_RESPONSES_DIR, ML_MODELS_DIR

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


# Path untuk FAISS cache di disk
_FAISS_CACHE_DIR = ML_MODELS_DIR / "faiss_index"

# Chunk size besar → lebih sedikit chunks → lebih sedikit embed requests
_CHUNK_SIZE      = 2000
_CHUNK_OVERLAP   = 150
# Kirim 5 chunk per batch, tunggu 65 detik → aman di bawah 100 req/menit free tier
_EMBED_BATCH_SIZE  = 5
_EMBED_BATCH_DELAY = 65.0


def _embed_with_retry(vs: Any, batch: list, embeddings: Any, max_retries: int = 3) -> None:
    """Tambahkan batch ke vector store dengan retry otomatis saat kena 429."""
    for attempt in range(max_retries):
        try:
            vs.add_documents(batch)
            return
        except Exception as exc:
            msg = str(exc)
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                # Coba parse retryDelay dari pesan error, fallback ke 65 detik
                delay = _EMBED_BATCH_DELAY
                import re
                m = re.search(r"retry[_ ]in\s+([\d.]+)s", msg, re.IGNORECASE)
                if m:
                    delay = float(m.group(1)) + 5.0  # tambah buffer 5 detik
                logger.warning(
                    "Rate limit 429 (attempt %d/%d) — tunggu %.0fs...",
                    attempt + 1, max_retries, delay,
                )
                time.sleep(delay)
            else:
                raise


def _build_vector_store() -> Any:
    """
    Buat FAISS vector store dari knowledge-base texts.
    - Chunk size besar agar jumlah chunks minimal.
    - Embed batch kecil (5) dengan jeda 65 detik → aman di free tier (100 req/menit).
    - Retry otomatis pakai retryDelay dari API saat kena 429.
    - Cache ke disk — restart berikutnya load instan tanpa embed ulang.
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

    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=api_key,
    )

    # ── Load dari cache jika sudah ada ────────────────────────────────────
    if _FAISS_CACHE_DIR.exists():
        try:
            vs = FAISS.load_local(
                str(_FAISS_CACHE_DIR),
                embeddings,
                allow_dangerous_deserialization=True,
            )
            logger.info("FAISS vector store dimuat dari cache (%d docs)", vs.index.ntotal)
            return vs
        except Exception as exc:
            logger.warning("Cache FAISS tidak valid, rebuild: %s", exc)

    # ── Build dari knowledge base ──────────────────────────────────────────
    raw_text = _load_kb_texts()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=_CHUNK_SIZE,
        chunk_overlap=_CHUNK_OVERLAP,
        separators=["\n\n---\n", "\n\n", "\n", " "],
    )
    chunks = splitter.create_documents([raw_text])
    total  = len(chunks)
    logger.info(
        "Knowledge base: %d chunks (size=%d) akan di-embed dalam batch %d",
        total, _CHUNK_SIZE, _EMBED_BATCH_SIZE,
    )

    # Embed batch pertama untuk membuat vector store
    first_batch = chunks[:_EMBED_BATCH_SIZE]
    vs = FAISS.from_documents(first_batch, embeddings)

    # Embed sisa chunks secara bertahap dengan jeda
    remaining   = chunks[_EMBED_BATCH_SIZE:]
    total_batch = (len(remaining) + _EMBED_BATCH_SIZE - 1) // _EMBED_BATCH_SIZE + 1
    for i in range(0, len(remaining), _EMBED_BATCH_SIZE):
        batch      = remaining[i: i + _EMBED_BATCH_SIZE]
        batch_num  = (i // _EMBED_BATCH_SIZE) + 2
        logger.info("Embedding batch %d/%d (%d chunks)...", batch_num, total_batch, len(batch))
        time.sleep(_EMBED_BATCH_DELAY)
        _embed_with_retry(vs, batch, embeddings)

    # ── Simpan ke cache ────────────────────────────────────────────────────
    try:
        _FAISS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        vs.save_local(str(_FAISS_CACHE_DIR))
        logger.info("FAISS vector store di-cache ke disk: %s", _FAISS_CACHE_DIR)
    except Exception as exc:
        logger.warning("Gagal menyimpan FAISS cache: %s", exc)

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
PENTING: Langsung berikan saran tanpa kalimat pembuka atau sapaan. Mulai langsung dengan poin pertama.

DATA SENSOR FARM "{farm_id}":
- Jenis Tanaman   : {crop_type}
- Kelembapan Tanah: {soil_moisture}%
- pH Tanah        : {soil_ph}
- Suhu Udara      : {temperature}°C
- Kelembapan Udara: {humidity}%
- Curah Hujan     : {rainfall_mm} mm
- Sinar Matahari  : {sunlight_hours} jam
- Prediksi ML     : {ml_disease_prediction}

REFERENSI PERTANIAN:
{retrieved_context}

Tulis saran tindakan dalam Bahasa Indonesia (maksimal 250 kata), format poin-poin singkat:
1. Kondisi saat ini dan penilaian risiko
2. Tindakan segera (irigasi/pemupukan/pengendalian hama)
3. Rekomendasi jangka pendek (3-7 hari ke depan)

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
            max_output_tokens=1024,
        )
        logger.info(
            "Calling Gemini (%s) for farm %s via LangChain",
            model_name, context.get("farm_id"),
        )
        response = llm.invoke(filled)
        # Gemini newer models may return content as a list of blocks
        raw = response.content
        if isinstance(raw, list):
            advice = " ".join(
                block.get("text", "") if isinstance(block, dict) else str(block)
                for block in raw
            ).strip()
        else:
            advice = str(raw).strip()

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
