# 🌱 ArgoMind
### Smart Farming IoT Dashboard

> **ArgoMind** is an end-to-end smart farming platform that connects IoT sensors, machine learning disease prediction, real-time weather data, and a Gemini-powered RAG advisory into a single production-ready dashboard.

---

## 📋 Table of Contents

- [Challenge Theme](#-challenge-theme)
- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Data Flow & Workflows](#-data-flow--workflows)
- [Local Development Guide](#-local-development-guide)
- [Environment Variables](#-environment-variables)
- [Alert Thresholds](#-alert-thresholds)
- [Extending the AI Layer](#-extending-the-ai-layer)
- [LangChain Integration](#-langchain-integration)
- [IBM Bob — AI Development Assistant](#-ibm-bob--ai-development-assistant)

---

## 🏆 Challenge Theme

**IBM Hackathon — AI for Good: Smart Agriculture**

Leveraging artificial intelligence and IoT to help smallholder farmers make better, faster, data-driven decisions that improve crop yield, reduce disease loss, and optimize resource usage.

---

## ❗ Problem Statement

Smallholder farmers in developing countries face three critical challenges:

1. **Delayed disease detection** — By the time symptoms are visible, crop loss is already significant
2. **Inefficient resource use** — Overwatering, under-fertilising, or wrong-timing of inputs
3. **Lack of expert access** — Agricultural advisors are expensive and geographically distant

These problems cost billions in annual crop losses worldwide and disproportionately affect small-scale farmers.

---

## 💡 Solution Overview

ArgoMind provides an affordable, open-source IoT + AI stack that any farmer can deploy:

- **IoT sensors** (ESP32 + soil/temperature/humidity sensors) publish data via MQTT
- **XGBoost ML model** runs disease risk prediction on every incoming reading
- **LangChain RAG pipeline** retrieves relevant farming knowledge and generates actionable advice via Google Gemini
- **Real-time dashboard** shows live sensor readings, weather forecasts, and AI recommendations
- **Demo mode** lets anyone try the full system without hardware using the built-in simulator

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📡 **Real-Time IoT Ingestion** | MQTT-based sensor data pipeline via Eclipse Mosquitto |
| 🤖 **ML Disease Prediction** | XGBoost model trained on crop disease datasets |
| 🧠 **RAG AI Advisory** | LangChain + FAISS + Google Gemini for contextual farming advice |
| 🌤️ **Auto Weather Sync** | OpenWeatherMap integration, fetched on startup and daily at 06:00 UTC |
| 🗺️ **Location Autocomplete** | Type a city name — coordinates resolved automatically via Geocoding API |
| 🎮 **IoT Simulator** | Send virtual sensor data without hardware for demos and testing |
| 📋 **ESP32 Code Generator** | Auto-generates ready-to-flash Arduino code after farm registration |
| 🐳 **One-Command Deploy** | Full Docker Compose stack: DB + MQTT + Backend + Frontend |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ArgoMind Platform                     │
│                                                              │
│  ┌──────────┐    MQTT     ┌─────────────────────────────┐   │
│  │  ESP32   │────────────▶│        Mosquitto Broker      │   │
│  │ Sensor   │             │         (port 1883)          │   │
│  └──────────┘             └──────────────┬──────────────┘   │
│                                          │ subscribe         │
│  ┌──────────┐    HTTP     ┌──────────────▼──────────────┐   │
│  │Simulator │────────────▶│       FastAPI Backend        │   │
│  │  (UI)    │             │                              │   │
│  └──────────┘             │  ┌─────────┐  ┌──────────┐  │   │
│                           │  │XGBoost  │  │LangChain │  │   │
│  ┌──────────┐    REST     │  │  ML     │  │RAG+Gemini│  │   │
│  │ Next.js  │◀───────────▶│  └─────────┘  └──────────┘  │   │
│  │Dashboard │             │                              │   │
│  └──────────┘             │  ┌──────────────────────┐   │   │
│                           │  │     PostgreSQL DB      │   │   │
│                           │  └──────────────────────┘   │   │
│                           └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role |
|---|---|
| **Mosquitto** | MQTT broker — receives sensor payloads from IoT devices |
| **FastAPI** | REST API, MQTT subscriber, ML inference, LangChain RAG orchestration, APScheduler |
| **PostgreSQL** | Stores farms, sensor readings, weather records, AI insight history |
| **Next.js** | Real-time dashboard, simulator UI, farm registration |
| **XGBoost** | On-device ML model for crop disease risk prediction |
| **LangChain + FAISS** | Vector-based knowledge retrieval, embedded via Gemini Embedding API |
| **Google Gemini** | LLM for generating actionable farming recommendations |
| **OpenWeatherMap** | Daily weather forecast (rainfall, sunlight hours) per farm location |

---

## 🛠️ Tech Stack

### Backend
| Library | Version | Purpose |
|---|---|---|
| FastAPI | ≥0.111 | REST API framework |
| SQLAlchemy | ≥2.0 | ORM / database layer |
| psycopg2 | ≥2.9 | PostgreSQL driver |
| paho-mqtt | ≥1.6 | MQTT client |
| APScheduler | ≥3.10 | Daily weather sync job |
| XGBoost | ≥2.1 | ML disease prediction |
| LangChain | ≥0.3 | RAG orchestration |
| langchain-google-genai | ≥2.0 | Gemini LLM + Embeddings |
| faiss-cpu | ≥1.8 | In-memory vector store |
| httpx | ≥0.27 | Async HTTP (OpenWeatherMap, Geocoding) |

### Frontend
| Library | Version | Purpose |
|---|---|---|
| Next.js | 14 | React framework |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3 | Utility-first styling |
| Axios | latest | HTTP client |
| Lucide React | latest | Icon set |

---

## 📁 Project Structure

```
IBM_Hackathon/
├── docker-compose.yml          # Full stack orchestration
├── .env.docker.example         # Environment variable template
├── start.bat / start.sh        # One-click startup scripts
├── mosquitto/
│   └── mosquitto.conf          # MQTT broker configuration
│
├── backend/
│   ├── Dockerfile
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt
│   └── app/
│       ├── config.py           # Settings (pydantic-settings)
│       ├── database.py         # SQLAlchemy engine + demo farm seed
│       ├── models.py           # ORM models
│       ├── schemas.py          # Pydantic request/response schemas
│       ├── mqtt_client.py      # MQTT subscriber + message handler
│       ├── scheduler.py        # APScheduler (daily weather + startup fetch)
│       ├── routes/
│       │   ├── farms.py        # Farm CRUD, sensor, weather, AI insight endpoints
│       │   ├── health.py       # Health check + manual weather refresh trigger
│       │   └── simulator.py    # Virtual sensor injection endpoint
│       └── services/
│           ├── ai_service.py       # ML prediction orchestration
│           ├── langchain_service.py # RAG + LLM pipeline (FAISS cache + batch embed)
│           └── weather_service.py  # OpenWeatherMap fetch + upsert
│
├── frontend/
│   ├── Dockerfile
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # Main dashboard (Demo + Hardware tabs)
│       │   └── simulator/page.tsx  # IoT sensor simulator UI
│       ├── components/
│       │   ├── AIInsightPanel.tsx  # ML prediction + Gemini RAG advice panel
│       │   ├── RegisterFarmModal.tsx # Farm registration (location autocomplete)
│       │   ├── HardwareCodeModal.tsx # ESP32 code generator
│       │   └── SensorCard.tsx      # Reusable sensor value card
│       ├── lib/api.ts              # Axios API client
│       └── types/index.ts          # TypeScript interfaces
│
└── hardware/
    └── argomind_sensor/            # ESP32 Arduino sketch template
```

---

## 🗄️ Database Schema

```sql
-- Registered farms
CREATE TABLE farms (
    farm_id      VARCHAR(64) PRIMARY KEY,
    crop_type    VARCHAR(64),
    sowing_date  DATE,
    latitude     FLOAT NOT NULL,
    longitude    FLOAT NOT NULL
);

-- IoT sensor readings (ingested via MQTT)
CREATE TABLE sensor_data (
    id            SERIAL PRIMARY KEY,
    farm_id       VARCHAR(64) REFERENCES farms(farm_id),
    timestamp     TIMESTAMPTZ DEFAULT now(),
    soil_moisture FLOAT,
    soil_ph       FLOAT,
    temperature   FLOAT,
    humidity      FLOAT
);

-- Daily weather records (OpenWeatherMap)
CREATE TABLE weather_data (
    id             SERIAL PRIMARY KEY,
    farm_id        VARCHAR(64) REFERENCES farms(farm_id),
    date           DATE NOT NULL,
    rainfall_mm    FLOAT,
    sunlight_hours FLOAT,
    UNIQUE (farm_id, date)
);

-- AI insight history (ML + LLM results)
CREATE TABLE ai_insight_history (
    id                     SERIAL PRIMARY KEY,
    farm_id                VARCHAR(64) REFERENCES farms(farm_id),
    timestamp              TIMESTAMPTZ DEFAULT now(),
    ml_disease_prediction  TEXT,
    llm_advice             TEXT
);
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `POST` | `/api/weather/refresh` | Manually trigger weather fetch for all farms |
| `GET` | `/api/farms` | List all registered farms |
| `GET` | `/api/farms/{id}` | Get single farm details |
| `POST` | `/api/farms/register` | Register a new farm |
| `GET` | `/api/farms/{id}/sensors` | Get latest sensor readings |
| `GET` | `/api/farms/{id}/weather` | Get today's weather data |
| `GET` | `/api/farms/{id}/insight` | Get AI insight (ML + LLM) |
| `GET` | `/api/simulator/presets` | List simulator scenario presets |
| `POST` | `/api/simulator/send` | Send virtual sensor data |

### Example: Register a Farm

```bash
curl -X POST http://localhost:8000/api/farms/register \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "farm-001",
    "crop_type": "Rice",
    "location_name": "Bandung"
  }'
```

> `location_name` is automatically geocoded to lat/lon via the OpenWeatherMap Geocoding API.
> You may still provide `latitude` and `longitude` directly if preferred.

### Example: MQTT Sensor Payload

```json
{
  "farm_id": "farm-001",
  "soil_moisture": 48.5,
  "soil_ph": 6.2,
  "temperature": 29.0,
  "humidity": 72.0
}
```

Publish to topic: `farm/sensor`

---

## 🔄 Data Flow & Workflows

### 1. Sensor Ingestion & Alert Flow

```
ESP32 / Simulator
    │
    │ MQTT publish → topic: farm/sensor
    ▼
Mosquitto Broker
    │
    │ on_message callback
    ▼
FastAPI MQTT Client
    │
    ├─▶ Validate JSON payload
    ├─▶ Write SensorData to PostgreSQL
    └─▶ Check alert thresholds
            │
            └─▶ (future) trigger Telegram / webhook alert
```

### 2. Weather Sync Flow

```
App Startup  ──▶  fetch_all_farms_weather()  ──▶  OpenWeatherMap API
                                                        │
APScheduler (daily 06:00 UTC)  ─────────────────────────┘
                                                        │
                                              Upsert WeatherData
                                              (rainfall_mm, sunlight_hours)
```

### 3. AI Insight Request Flow

```
GET /api/farms/{id}/insight
    │
    ├─▶ Fetch latest SensorData snapshot
    ├─▶ Fetch latest WeatherData
    │
    ├─▶ XGBoost ML prediction
    │       └─▶ returns disease risk label + confidence
    │
    └─▶ LangChain RAG pipeline
            │
            ├─▶ Load FAISS vector store (from disk cache if available)
            │       └─▶ If cache miss: batch-embed knowledge base
            │           (20 chunks/batch, 65s delay → safe under free-tier quota)
            │
            ├─▶ Similarity search (k=4 relevant chunks)
            │
            ├─▶ Build prompt with sensor data + weather + retrieved context
            │
            └─▶ Google Gemini (gemini-3.1-flash-lite) → farming advice
                    │
                    └─▶ Save to AIInsightHistory + return to frontend
```

---

## 🚀 Quick Start (Docker — Recommended)

### Windows
```bat
REM Double-click or run from PowerShell:
.\start.bat
```

### macOS / Linux
```bash
chmod +x start.sh && ./start.sh
```

The script will:
1. Check that Docker Desktop is running
2. Copy `.env.docker.example` → `.env` if missing and prompt you to fill in API keys
3. Run `docker compose up --build`

Once all containers are healthy, open:

| Service | URL |
|---|---|
| 🌐 Dashboard | http://localhost:3000 |
| ⚙️ API Docs (Swagger) | http://localhost:8000/docs |
| 💚 Health Check | http://localhost:8000/health |
| 📡 MQTT Broker | `localhost:1883` |


---

## 🚀 Local Development Guide

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Docker Desktop (for MQTT broker) **or** local Mosquitto install

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-org/argomind.git
cd argomind
```

### Step 2 — Set Up the Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE argomind;"
```

### Step 3 — Configure the Backend

```bash
cd backend
cp .env.example .env
# Edit .env — fill in GOOGLE_API_KEY and OPENWEATHER_API_KEY
```

### Step 4 — Install Backend Dependencies

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Step 5 — Start the MQTT Broker

```bash
# Using Docker:
docker run -d -p 1883:1883 \
  -v $(pwd)/../mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf \
  eclipse-mosquitto:2
```

### Step 6 — Run the Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Step 7 — Configure the Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Step 8 — Install Frontend Dependencies & Run

```bash
npm install
npm run dev
```

### Step 9 — Register a Test Farm

```bash
curl -X POST http://localhost:8000/api/farms/register \
  -H "Content-Type: application/json" \
  -d '{"farm_id": "test-farm", "crop_type": "Rice", "location_name": "Jakarta"}'
```

### Step 10 — Simulate a Sensor Reading

```bash
# Via HTTP (simulator endpoint):
curl -X POST http://localhost:8000/api/simulator/send \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "test-farm",
    "soil_moisture": 45.0,
    "soil_ph": 6.0,
    "temperature": 30.0,
    "humidity": 70.0
  }'

# Via MQTT (mosquitto_pub):
mosquitto_pub -h localhost -t farm/sensor -m \
  '{"farm_id":"test-farm","soil_moisture":45,"soil_ph":6.0,"temperature":30,"humidity":70}'
```

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | `postgres` | PostgreSQL password |
| `GOOGLE_API_KEY` | ✅ | — | Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey)) |
| `OPENWEATHER_API_KEY` | ✅ | — | OpenWeatherMap API key ([get one free](https://openweathermap.org/api)) |
| `LANGCHAIN_MODEL` | ❌ | `gemini-3.1-flash-lite` | Gemini model name |
| `LANGCHAIN_TEMPERATURE` | ❌ | `0.3` | LLM temperature (0.0–1.0) |
| `MQTT_TOPIC` | ❌ | `farm/sensor` | MQTT topic to subscribe to |
| `MQTT_USERNAME` | ❌ | — | MQTT broker username |
| `MQTT_PASSWORD` | ❌ | — | MQTT broker password |
| `BACKEND_PORT` | ❌ | `8000` | Backend exposed port |
| `FRONTEND_PORT` | ❌ | `3000` | Frontend exposed port |
| `NEXT_PUBLIC_API_BASE_URL` | ❌ | `http://localhost:8000` | Backend URL visible to the browser |
| `DEBUG` | ❌ | `false` | Enable debug logging |

---

## 🚨 Alert Thresholds

| Metric | Warning | Critical |
|---|---|---|
| Soil Moisture | < 35% | < 20% |
| Soil pH | < 6.0 or > 7.2 | < 5.5 or > 7.5 |
| Air Temperature | > 34°C | > 38°C |
| Air Humidity | < 45% | < 30% |

---

## 🔧 Extending the AI Layer

### ML Disease Prediction

The ML pipeline lives in [`backend/app/services/ai_service.py`](backend/app/services/ai_service.py).
The trained XGBoost model is loaded from `storage/ml/models/`.

To retrain:
```bash
cd backend
python ml/train.py
```

Features used: `soil_moisture`, `soil_ph`, `temperature`, `humidity`

---

## 🔀 LangChain Integration

### Role in the Architecture

ArgoMind uses a **Retrieval-Augmented Generation (RAG)** pipeline to ground Gemini's responses in domain-specific farming knowledge rather than relying on general training data.

### How It Works

1. **Knowledge Base** — Plain-text files (`kb_*.txt`) in `storage/llm_responses/` cover topics like irrigation, pH management, fertilisation, disease control, and weather handling for major Indonesian crops (rice, corn, chili, tomato, potato, soybean, melon).

2. **Embedding** — On first use, knowledge base chunks are embedded using `models/gemini-embedding-001` and stored in a **FAISS** vector index on disk (`storage/ml/models/faiss_index/`). Subsequent restarts load directly from cache — no re-embedding needed.

3. **Rate-Limit Safety** — Embedding is batched (5 chunks per batch, 65-second delays) to stay within the Google free-tier limit of 100 requests/minute. If a 429 is returned, the delay is parsed from the `retryDelay` field and respected automatically.

4. **Retrieval** — At inference time, the top-4 most relevant knowledge chunks are retrieved via cosine similarity search.

5. **Generation** — The retrieved context, sensor snapshot, and weather data are assembled into a structured prompt. `gemini-3.1-flash-lite` generates a concise, actionable recommendation in under 15 seconds.

### Activation

The RAG pipeline activates automatically when `GOOGLE_API_KEY` is set. No additional configuration required.

---

## 🏢 IBM Bob — AI Development Assistant

This project was built with the assistance of **IBM Bob**, an AI-powered software engineering assistant.

### What Bob Was Used For

- Scaffolding the FastAPI backend and Next.js frontend structure
- Debugging Docker Compose startup issues and container conflicts
- Diagnosing and fixing Gemini API compatibility issues (model deprecations, response format changes, embedding rate limits)
- Implementing the LangChain RAG pipeline with FAISS disk caching and batch embedding
- Adding the OpenWeatherMap Geocoding integration (city name → coordinates)
- Translating the entire frontend UI from Indonesian to English
- Writing and maintaining this README

### IBM Watsonx as a Potential LLM Backend

While ArgoMind currently uses Google Gemini as the LLM provider, the LangChain abstraction makes it straightforward to swap in **IBM Watsonx** as the backend:

```python
from langchain_ibm import WatsonxLLM

llm = WatsonxLLM(
    model_id="ibm/granite-13b-instruct-v2",
    url="https://us-south.ml.cloud.ibm.com",
    project_id="YOUR_WATSONX_PROJECT_ID",
    params={"max_new_tokens": 600, "temperature": 0.3},
)
```

This would make ArgoMind fully IBM-native — using Watsonx for LLM inference while keeping the same RAG + FAISS retrieval architecture.

---

<p align="center">
  Built with ❤️ for IBM Hackathon · Powered by FastAPI, Next.js, LangChain & Google Gemini
</p>
