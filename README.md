<div align="center">

# 🌱 ArgoMind
### Smart Farming IoT Dashboard

**Turning raw sensor data into actionable farm intelligence — powered by AI**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)


</div>

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
- [Langflow Integration](#-langflow-integration)
- [IBM Bob — AI Development Assistant](#-ibm-bob--ai-development-assistant)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🏆 Challenge Theme

> **Building Intelligent Systems for the Future of Work** *(Wild Card Category)*

ArgoMind directly addresses the gap between sophisticated IoT technology and the practical needs of farmers in the field — making advanced AI accessible to people who need it most, not just engineers.

---

## ❗ Problem Statement

IoT technology in agriculture can already collect vast amounts of environmental data — soil moisture, temperature, pH levels, and more. However, **the core problem is not data collection; it is data interpretation.**

Farmers — especially smallholders — are overwhelmed by dashboards full of raw numbers and technical charts. This cognitive overload leads to:

- ⏳ **Slow decision-making** when immediate action is needed
- ❓ **Uncertainty** about whether to irrigate, fertilize, or treat for pests
- 📉 **Crop losses** caused by delayed or incorrect responses to environmental stress
- 🚫 **Low adoption** of IoT tools because they feel too complex to use

The technology exists. The data exists. What is missing is an intelligent bridge that **translates data into human language and timely action**.

---

## 💡 Solution Overview

ArgoMind transforms a traditional IoT monitoring dashboard into a **Smart Virtual Farm Assistant**.

Instead of presenting raw sensor readings, ArgoMind:

1. **Ingests** real-time sensor data via MQTT from IoT field devices
2. **Enriches** it with daily weather forecast data from OpenWeatherMap
3. **Analyzes** the combined context using a Machine Learning model for disease risk prediction
4. **Translates** findings into natural-language recommendations via a Large Language Model (LLM / Langflow)
5. **Proactively alerts** farmers via Telegram the moment a critical threshold is breached

Farmers receive a **clear, plain-language recommendation** — not a confusing number — enabling fast, confident, and correct action.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📡 **Real-time IoT Ingestion** | MQTT subscriber ingests sensor payloads from any ESP32/Arduino device |
| 🗄️ **Persistent Storage** | All sensor readings, weather data, and AI insights stored in PostgreSQL |
| ☁️ **Daily Weather Sync** | APScheduler fetches OpenWeatherMap forecasts every day at 06:00 UTC |
| 🤖 **AI Insight Engine** | ML disease prediction + LLM natural-language advice (pluggable stubs) |
| 📲 **Telegram Alerts** | Instant push notifications when sensor thresholds are breached |
| 🌐 **Responsive Dashboard** | Next.js + TailwindCSS dashboard with color-coded status indicators |
| 📝 **Farm Registration** | In-app modal to register farm ID, GPS coordinates, and Telegram ID |
| 🔄 **Auto-polling** | Frontend refreshes sensor data every 15 seconds automatically |
| 🔧 **Pluggable AI Layer** | ML and LLM stubs in `ai_service.py` — drop in your model with zero refactoring |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ArgoMind System                             │
│                                                                     │
│  ┌──────────┐   MQTT    ┌──────────────────────────────────────┐   │
│  │ IoT Node │──publish─▶│           FastAPI Backend             │   │
│  │ ESP32 /  │           │                                       │   │
│  │ Arduino  │           │  ┌────────────┐  ┌────────────────┐  │   │
│  └──────────┘           │  │mqtt_client │  │  APScheduler   │  │   │
│                         │  │  .py       │  │ (daily 06:00)  │  │   │
│  ┌──────────┐           │  └─────┬──────┘  └───────┬────────┘  │   │
│  │Mosquitto │           │        │                 │            │   │
│  │  Broker  │           │  ┌─────▼─────────────────▼────────┐  │   │
│  └──────────┘           │  │        PostgreSQL Database      │  │   │
│                         │  │  farms │ sensor_data │ weather  │  │   │
│  ┌──────────┐  REST API │  │        │ ai_insight_history     │  │   │
│  │ Next.js  │◀─────────▶│  └────────────────────────────────┘  │   │
│  │Dashboard │           │                                       │   │
│  └──────────┘           │  ┌────────────┐  ┌────────────────┐  │   │
│                         │  │ai_service  │  │telegram_service│  │   │
│  ┌──────────┐           │  │(ML + LLM)  │  │    (alerts)    │  │   │
│  │ Telegram │◀──alert───│  └────────────┘  └────────────────┘  │   │
│  │   Bot    │           └──────────────────────────────────────┘   │
│  └──────────┘                                                       │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌───────────────────┐  │
│  │OpenWeatherMap│   │  Langflow / LLM  │   │   ML Model (.pkl) │  │
│  │     API      │   │   (pluggable)    │   │   (pluggable)     │  │
│  └──────────────┘   └──────────────────┘   └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | File | Responsibility |
|---|---|---|
| MQTT Subscriber | `backend/app/mqtt_client.py` | Subscribe to `farm/sensor`, persist readings, trigger threshold check |
| Weather Scheduler | `backend/app/scheduler.py` | APScheduler cron job — fetch & upsert daily weather |
| Weather Fetcher | `backend/app/services/weather_service.py` | Call OpenWeatherMap, compute rain + sunlight estimates |
| AI Service | `backend/app/services/ai_service.py` | ML prediction + LLM advice (pluggable stubs) |
| Alert Service | `backend/app/services/telegram_service.py` | Evaluate thresholds, send Telegram notifications |
| REST API | `backend/app/routes/farms.py` | All farm/sensor/weather/insight endpoints |
| Database Models | `backend/app/models.py` | SQLAlchemy ORM — 4 tables |
| Dashboard | `frontend/src/app/page.tsx` | Main UI with polling, state, and modal |
| Sensor Cards | `frontend/src/components/SensorCard.tsx` | Color-coded metric widgets |
| AI Panel | `frontend/src/components/AIInsightPanel.tsx` | Render ML prediction + LLM advice |
| Register Modal | `frontend/src/components/RegisterFarmModal.tsx` | Farm registration form |

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 |
| ORM | SQLAlchemy 2.0 |
| Validation | Pydantic v2 + pydantic-settings |
| Database | PostgreSQL 16 |
| MQTT Client | Paho-MQTT 1.6 |
| Scheduler | APScheduler 3.10 |
| HTTP Client | httpx 0.27 |
| Notifications | telegram-easy |
| Runtime | Python 3.11+ / Uvicorn |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | TailwindCSS 3 |
| Icons | lucide-react |
| HTTP Client | Axios |

---

## 📁 Project Structure

```
argomind/
│
├── backend/
│   ├── main.py                          # FastAPI app — lifespan, CORS, router registration
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── app/
│   │   ├── config.py                    # Pydantic Settings + storage path constants
│   │   ├── database.py                  # SQLAlchemy engine, SessionLocal, init_db()
│   │   ├── models.py                    # ORM models: Farm, SensorData, WeatherData, AIInsightHistory
│   │   ├── schemas.py                   # Pydantic request/response schemas
│   │   ├── mqtt_client.py               # Paho-MQTT subscriber (background thread)
│   │   ├── scheduler.py                 # APScheduler — daily weather job
│   │   │
│   │   ├── routes/
│   │   │   ├── health.py                # GET /health
│   │   │   └── farms.py                 # POST /register, GET /sensors /weather /insight
│   │   │
│   │   └── services/
│   │       ├── ai_service.py            # 🔧 PLUGGABLE: predict_disease() + get_llm_advice()
│   │       ├── telegram_service.py      # Threshold evaluation + Telegram push
│   │       └── weather_service.py       # OpenWeatherMap fetch + DB upsert
│   │
│   └── storage/
│       ├── llm_responses/               # Raw JSON output from LLM calls
│       └── ml/
│           ├── training_data/           # CSV / Parquet datasets
│           ├── models/                  # Trained model files (.pkl, .onnx)
│           └── results/                 # Evaluation reports (accuracy, F1, etc.)
│
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    │
    └── src/
        ├── app/
        │   ├── layout.tsx               # Root layout + font + global CSS
        │   ├── globals.css              # Tailwind directives
        │   └── page.tsx                 # Dashboard page — polling, state, layout
        │
        ├── components/
        │   ├── SensorCard.tsx           # Reusable metric card with status colors
        │   ├── AIInsightPanel.tsx       # AI insight section (ML + LLM output)
        │   └── RegisterFarmModal.tsx    # Farm registration modal form
        │
        ├── lib/
        │   └── api.ts                   # Axios API client functions
        │
        └── types/
            └── index.ts                 # TypeScript interfaces
```

---

## 🗄️ Database Schema

```
┌──────────────────────────────────────────────────────────────────┐
│  farms                                                           │
│  ─────────────────────────────────────────────────────────────  │
│  farm_id (PK)  VARCHAR   │  telegram_id  VARCHAR                │
│  crop_type     VARCHAR   │  sowing_date  DATE                   │
│  latitude      FLOAT     │  longitude    FLOAT                  │
└─────────────────────────┬────────────────────────────────────────┘
                          │ 1 : N (FK)
          ┌───────────────┼───────────────────┐
          │               │                   │
          ▼               ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────────────┐
│  sensor_data    │ │  weather_data   │ │  ai_insight_history      │
│  ─────────────  │ │  ─────────────  │ │  ──────────────────────  │
│  id (PK)        │ │  id (PK)        │ │  id (PK)                 │
│  farm_id (FK)   │ │  farm_id (FK)   │ │  farm_id (FK)            │
│  timestamp      │ │  date           │ │  timestamp               │
│  soil_moisture  │ │  rainfall_mm    │ │  ml_disease_prediction   │
│  soil_ph        │ │  sunlight_hours │ │  llm_advice              │
│  temperature    │ └─────────────────┘ └──────────────────────────┘
│  humidity       │
└─────────────────┘
```

---

## 📡 API Reference

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service liveness check |
| `POST` | `/api/farms/register` | Register a new farm |
| `GET` | `/api/farms/{farm_id}/sensors` | Latest sensor readings (`?limit=N`) |
| `GET` | `/api/farms/{farm_id}/weather` | Today's weather data |
| `GET` | `/api/farms/{farm_id}/insight` | Generate + persist AI insight |

Interactive API docs available at **`http://localhost:8000/docs`** (Swagger UI) and **`http://localhost:8000/redoc`**.

### Example: Register a Farm
```bash
curl -X POST http://localhost:8000/api/farms/register \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "farm-001",
    "telegram_id": "123456789",
    "crop_type": "Padi",
    "sowing_date": "2024-06-01",
    "latitude": -6.9175,
    "longitude": 107.6191
  }'
```

### Example: MQTT Sensor Payload
```json
{
  "farm_id": "farm-001",
  "soil_moisture": 18.4,
  "soil_ph": 5.2,
  "temperature": 39.1,
  "humidity": 28.0
}
```
Topic: `farm/sensor`

---

## 🔄 Data Flow & Workflows

### 1. Sensor Ingestion & Alert Flow
```
IoT Device
  │
  └─▶ MQTT Broker (topic: farm/sensor)
        │
        └─▶ mqtt_client.py — on_message()
              │
              ├─▶ Validate farm_id exists in DB
              ├─▶ INSERT into sensor_data
              └─▶ check_and_notify()
                    │
                    ├─ soil_moisture < 20%  ──┐
                    ├─ pH out of 5.5–7.5   ──┤─▶ send Telegram alert ▶ Farmer
                    ├─ temperature > 38°C  ──┤
                    └─ humidity < 30%      ──┘
```

### 2. Daily Weather Sync Flow
```
APScheduler (every day at 06:00 UTC)
  │
  └─▶ fetch_all_farms_weather()
        │
        └─▶ For each farm in DB:
              │
              ├─▶ GET OpenWeatherMap /forecast (8×3h blocks)
              ├─▶ Calculate total rainfall_mm (sum of 3h rain)
              ├─▶ Estimate sunlight_hours (clear blocks 06:00–18:00)
              └─▶ UPSERT into weather_data
```

### 3. AI Insight Request Flow
```
Farmer clicks "Perbarui Analisis" on Dashboard
  │
  └─▶ GET /api/farms/{farm_id}/insight
        │
        ├─▶ Fetch latest sensor snapshot from DB
        ├─▶ Fetch today's weather snapshot from DB
        │
        ├─▶ predict_disease(sensor_dict)        ← ML model (pluggable)
        │     └─▶ Returns disease risk label
        │
        ├─▶ get_llm_advice(context)             ← LLM / Langflow (pluggable)
        │     └─▶ Returns natural-language recommendation
        │
        ├─▶ Save JSON response to storage/llm_responses/
        ├─▶ INSERT into ai_insight_history
        └─▶ Return AIInsightOut to frontend
```

---

## 🚀 Local Development Guide

### Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Install |
|---|---|---|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 14+ | [postgresql.org](https://postgresql.org) |
| Mosquitto (MQTT) | any | [mosquitto.org](https://mosquitto.org) |
| Git | any | [git-scm.com](https://git-scm.com) |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-org/argomind.git
cd argomind
```

---

### Step 2 — Set Up the Database

Create a PostgreSQL database named `argomind`:

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE argomind;"
```

> Tables are created automatically on first startup via `init_db()` — no migration needed for development.

---

### Step 3 — Configure the Backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/argomind
OPENWEATHER_API_KEY=your_openweathermap_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
MQTT_BROKER=localhost
MQTT_PORT=1883
```

> See the full list of variables in the [Environment Variables](#-environment-variables) section.

---

### Step 4 — Install Backend Dependencies

```bash
# Still inside backend/
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

---

### Step 5 — Start the MQTT Broker

```bash
# If Mosquitto is installed as a service (Windows)
net start mosquitto

# macOS (Homebrew)
brew services start mosquitto

# Linux
sudo systemctl start mosquitto
```

---

### Step 6 — Run the Backend

```bash
# Inside backend/ with venv activated
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO  ArgoMind starting up
INFO  Database tables created
INFO  MQTT client started — broker=localhost:1883
INFO  APScheduler started — daily weather job registered at 06:00 UTC
INFO  Uvicorn running on http://0.0.0.0:8000
```

Open **http://localhost:8000/docs** to verify the API is running.

---

### Step 7 — Configure the Frontend

```bash
cd ../frontend
cp .env.local.example .env.local
```

`.env.local` should contain:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

### Step 8 — Install Frontend Dependencies & Run

```bash
# Inside frontend/
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

### Step 9 — Register a Test Farm

In the dashboard, click **"Daftarkan Kebun"** and fill in:

| Field | Example Value |
|---|---|
| Farm ID | `farm-001` |
| Telegram Chat ID | `123456789` |
| Crop Type | `Padi` |
| Latitude | `-6.9175` |
| Longitude | `107.6191` |

---

### Step 10 — Simulate a Sensor Reading (Optional)

Install `mosquitto_pub` or use any MQTT client, then publish:

```bash
mosquitto_pub -h localhost -t "farm/sensor" -m '{
  "farm_id": "farm-001",
  "soil_moisture": 18.0,
  "soil_ph": 6.2,
  "temperature": 29.5,
  "humidity": 62.0
}'
```

The dashboard will update within 15 seconds. If `soil_moisture < 20`, a Telegram alert is sent automatically.

---

## 🔐 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://...` | Full PostgreSQL connection string |
| `MQTT_BROKER` | `localhost` | MQTT broker hostname or IP |
| `MQTT_PORT` | `1883` | MQTT broker port |
| `MQTT_TOPIC` | `farm/sensor` | MQTT topic to subscribe |
| `MQTT_USERNAME` | *(empty)* | MQTT username (if broker requires auth) |
| `MQTT_PASSWORD` | *(empty)* | MQTT password |
| `OPENWEATHER_API_KEY` | *(empty)* | OpenWeatherMap API key |
| `TELEGRAM_BOT_TOKEN` | *(empty)* | Telegram Bot token from @BotFather |
| `SOIL_MOISTURE_MIN` | `20.0` | Alert threshold: minimum soil moisture (%) |
| `SOIL_PH_MIN` | `5.5` | Alert threshold: minimum pH |
| `SOIL_PH_MAX` | `7.5` | Alert threshold: maximum pH |
| `TEMPERATURE_MAX` | `38.0` | Alert threshold: maximum temperature (°C) |
| `HUMIDITY_MIN` | `30.0` | Alert threshold: minimum air humidity (%) |
| `APP_HOST` | `0.0.0.0` | Uvicorn bind host |
| `APP_PORT` | `8000` | Uvicorn bind port |
| `DEBUG` | `false` | Enable debug mode |

---

## 🚨 Alert Thresholds

ArgoMind evaluates every incoming sensor reading against these thresholds. If any value is out of range, an alert is immediately sent to the farmer's Telegram.

| Sensor | Condition | Alert Message |
|---|---|---|
| Soil Moisture | `< 20%` | ⚠️ Kelembapan Tanah kritis |
| Soil pH | `< 5.5` or `> 7.5` | ⚠️ pH Tanah di luar rentang normal |
| Temperature | `> 38°C` | ⚠️ Suhu terlalu tinggi |
| Air Humidity | `< 30%` | ⚠️ Kelembapan Udara rendah |

All thresholds are configurable via `.env` — no code changes required.

---

## 🔧 Extending the AI Layer

The AI integration is deliberately left as pluggable stubs in [`backend/app/services/ai_service.py`](backend/app/services/ai_service.py). Replace the two functions with your real implementations:

### ML Disease Prediction

```python
# backend/app/services/ai_service.py
import joblib
from app.config import ML_MODELS_DIR

_model = joblib.load(ML_MODELS_DIR / "disease_classifier_v1.pkl")

def predict_disease(sensor_payload: dict) -> str:
    X = [[
        sensor_payload["soil_moisture"],
        sensor_payload["soil_ph"],
        sensor_payload["temperature"],
        sensor_payload["humidity"],
    ]]
    label = _model.predict(X)[0]
    return f"Risiko terdeteksi: {label}"
```

### LLM / Langflow Advice

```python
import httpx

LANGFLOW_URL = "http://localhost:7860/api/v1/run/your-flow-id"

def get_llm_advice(context: dict) -> str:
    response = httpx.post(LANGFLOW_URL, json={"input_value": str(context)})
    return response.json()["outputs"][0]["outputs"][0]["results"]["message"]["text"]
```

Place trained model files in `backend/storage/ml/models/` and dataset files in `backend/storage/ml/training_data/`. Both directories are git-ignored by default.

---

## 🔀 Langflow Integration

Langflow is used as the **LLM orchestration layer** inside ArgoMind — it is the engine that takes raw sensor & weather context and produces **plain-language farming advice** for the farmer.

### Role in the Architecture

```
FastAPI Backend (ai_service.py)
  │
  └─▶ get_llm_advice(context)
        │
        └─▶ HTTP POST → Langflow API (http://localhost:7860/api/v1/run/<flow-id>)
                          │
                          └─▶ LLM Flow (built visually in Langflow UI)
                                │
                                └─▶ Returns natural-language recommendation → Dashboard
```

### How It Works

When a farmer clicks **"Perbarui Analisis"**, the backend bundles the latest sensor snapshot and today's weather data into a context dict, then calls Langflow:

```python
# backend/app/services/ai_service.py
import httpx

LANGFLOW_URL = "http://localhost:7860/api/v1/run/your-flow-id"

def get_llm_advice(context: dict) -> str:
    response = httpx.post(LANGFLOW_URL, json={"input_value": str(context)})
    return response.json()["outputs"][0]["outputs"][0]["results"]["message"]["text"]
```

- The **context** includes: `soil_moisture`, `soil_ph`, `temperature`, `humidity`, `rainfall_mm`, `sunlight_hours`, and `crop_type`
- Langflow runs the configured **visual LLM flow** (prompt engineering, model selection, output parsing — all done in the Langflow UI)
- The returned **natural-language string** is saved to `backend/storage/llm_responses/` and the `ai_insight_history` table, then rendered in the AI Insight Panel on the dashboard

### Why Langflow?

| Reason | Detail |
|---|---|
| **No-code flow builder** | LLM prompt logic is configured visually — no Python rewrite needed to change models |
| **Pluggable** | Swap to any LLM (OpenAI, Mistral, IBM Granite, etc.) by editing the flow, not the code |
| **Self-hosted** | Runs locally at `localhost:7860` — no external dependency during development |
| **Hackathon-friendly** | Rapid iteration on prompts without touching backend code |

### Running Langflow Locally

```bash
pip install langflow
langflow run
# Open http://localhost:7860 — build your flow and copy the Flow ID into LANGFLOW_FLOW_ID
```

Set the Flow ID in your `.env`:
```env
LANGFLOW_URL=http://localhost:7860
LANGFLOW_FLOW_ID=your-flow-id-here
```

---

## 🏢 IBM Bob — AI Development Assistant

**IBM Bob** is the AI coding assistant used throughout the development of ArgoMind as part of **IBM Hackathon 2024**.

### What Bob Was Used For

| Task | How Bob Helped |
|---|---|
| **Architecture Design** | Designed the full system architecture: MQTT pipeline, database schema, AI service layer |
| **Code Generation** | Scaffolded FastAPI routes, SQLAlchemy models, Paho-MQTT subscriber, and APScheduler jobs |
| **Frontend Components** | Generated Next.js + TailwindCSS components (`SensorCard`, `AIInsightPanel`, `RegisterFarmModal`) |
| **Documentation** | Wrote and structured this entire README |
| **Debugging** | Diagnosed and fixed issues across backend, frontend, and integration layers |
| **AI Layer Planning** | Designed the pluggable `ai_service.py` stub pattern for ML + LLM decoupling |

### IBM Watsonx as a Potential LLM Backend

The `get_llm_advice()` function in [`backend/app/services/ai_service.py`](backend/app/services/ai_service.py) is **fully pluggable**. IBM Watsonx.ai (e.g., the Granite model family) can be dropped in as the LLM backend:

```python
# Example: swap Langflow for IBM Watsonx.ai directly
from ibm_watsonx_ai.foundation_models import ModelInference

model = ModelInference(
    model_id="ibm/granite-13b-instruct-v2",
    credentials={"apikey": WATSONX_API_KEY, "url": WATSONX_URL},
    project_id=WATSONX_PROJECT_ID,
)

def get_llm_advice(context: dict) -> str:
    prompt = f"Kamu adalah asisten pertanian. Berikan saran singkat berdasarkan data ini: {context}"
    return model.generate_text(prompt=prompt)
```

Place the above in `backend/app/services/ai_service.py` and add the `ibm-watsonx-ai` package to `requirements.txt` — zero other changes required.

### Tool Summary

| Tool | Role in ArgoMind |
|---|---|
| **IBM Bob** | AI coding assistant used during all phases of development |
| **Langflow** | Visual LLM orchestration — produces natural-language farming advice |
| **IBM Watsonx.ai** | Optional drop-in LLM backend (Granite model family) — pluggable via `ai_service.py` |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.


<div align="center">

Built with ❤️ for farmers everywhere — IBM Hackathon 2024

</div>
