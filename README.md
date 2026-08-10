<div align="center">

# 🌱 AgriMind

### Decision Intelligence Platform for Precision Agriculture

*Transforming raw IoT sensor data into actionable farm decisions — powered by Machine Learning and IBM watsonx.ai*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](docker-compose.yml)
[![IBM watsonx](https://img.shields.io/badge/IBM-watsonx.ai-052FAD.svg)](https://www.ibm.com/watsonx)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%2020-339933.svg)](backend/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-000000.svg)](frontend/)
[![Python](https://img.shields.io/badge/ML-Python%203.11-3776AB.svg)](ml/)

</div>

---

## 1. Problem Statement

Smallholder and mid-scale farmers in Southeast Asia face a critical information gap:

| Challenge | Impact |
|---|---|
| Soil moisture & temperature data exist only as raw numbers | Farmers cannot interpret sensor values without agronomic expertise |
| Irrigation decisions are made reactively (after visible wilting) | 20–40 % water waste; 15–25 % yield loss per season |
| Early drought stress signals are invisible to the naked eye | Permanent crop damage before intervention is possible |
| Agricultural advisory is expensive and geographically inaccessible | Small farms have no access to precision agronomy |

**AgriMind bridges this gap** by deploying low-cost ESP32 IoT nodes in the field, ingesting their telemetry into a cloud platform that:

1. **Predicts** soil moisture trends 24–72 hours ahead using a time-series ML model.
2. **Diagnoses** the current crop stress state (healthy / watch / alert / critical).
3. **Translates** both into plain-language operational recommendations via an LLM, delivered to farmers in their local language through a simple web dashboard.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FIELD LAYER                                 │
│  ┌──────────┐  WiFi/MQTT   ┌─────────────────────────────────────┐  │
│  │  ESP32   │─────────────▶│         REST Ingestion API          │  │
│  │ + DHT22  │              │         (Node.js / Express)         │  │
│  │ + Soil   │              └──────────────┬──────────────────────┘  │
│  │ Moisture │                             │                          │
│  └──────────┘                             │                          │
└───────────────────────────────────────────┼─────────────────────────┘
                                            │
┌───────────────────────────────────────────▼─────────────────────────┐
│                      INTELLIGENCE LAYER                             │
│                                                                     │
│  ┌─────────────────────┐      ┌──────────────────────────────────┐  │
│  │  ML Prediction       │      │      IBM watsonx.ai (LLM)        │  │
│  │  Service (Python)    │      │                                  │  │
│  │                      │      │  Model: ibm/granite-13b-chat-v2  │  │
│  │  • Random Forest     │      │                                  │  │
│  │    Regressor         │      │  Technique: RAG                  │  │
│  │  • 24 / 48 / 72h     │      │  • System prompt = crop profile  │  │
│  │    soil moisture     │      │  • Context = live sensor data +  │  │
│  │    forecast          │      │    ML prediction output          │  │
│  │  • Drought stress    │      │  • Output = plain-language       │  │
│  │    classification    │      │    recommendation (ID/EN)        │  │
│  └──────────┬───────────┘      └───────────────┬──────────────────┘  │
│             │                                  │                      │
│             └──────────────┬───────────────────┘                      │
│                            │                                          │
│                   ┌────────▼────────┐                                 │
│                   │  Backend Core   │                                 │
│                   │  Orchestrator   │                                 │
│                   │  (Express API)  │                                 │
│                   └────────┬────────┘                                 │
└────────────────────────────┼────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                     PRESENTATION LAYER                              │
│                                                                     │
│   Next.js / React Dashboard  ─  Two-Panel Layout                   │
│                                                                     │
│   ┌──────────────────────┐  │  ┌──────────────────────────────┐   │
│   │  LEFT PANEL           │  │  │  RIGHT PANEL                 │   │
│   │  Sensor Metrics       │  │  │  AI Co-Worker                │   │
│   │  ─────────────────    │  │  │  ─────────────────────────   │   │
│   │  • Live soil temp     │  │  │  • Current status badge      │   │
│   │  • Live soil moisture │  │  │  • Plain-language diagnosis  │   │
│   │  • 72h trend chart    │  │  │  • Step-by-step actions      │   │
│   │  • Stress heatmap     │  │  │  • Next check-in reminder    │   │
│   └──────────────────────┘  │  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Structure

```
agrimind/
├── hardware/               # ESP32 firmware (C++ / Arduino)
│   ├── src/                # main.cpp – sensor read & MQTT publish
│   ├── include/            # Header files & pin definitions
│   └── lib/                # Third-party Arduino libraries
│
├── ml/                     # Machine Learning pipeline (Python 3.11)
│   ├── data/
│   │   ├── raw/            # Unprocessed sensor CSV exports
│   │   └── processed/      # Feature-engineered datasets
│   ├── notebooks/          # Exploratory analysis (Jupyter)
│   ├── src/                # train.py · predict.py · features.py
│   ├── models/             # Serialised .pkl model artifacts
│   └── tests/              # pytest unit tests
│
├── backend/                # REST API server (Node.js 20 / Express)
│   └── src/
│       ├── routes/         # /ingest · /predict · /insight · /health
│       ├── controllers/    # Route handler logic
│       ├── services/       # mlService · watsonxService · dbService
│       ├── middleware/      # Auth · rate-limit · error handler
│       ├── utils/          # Logger · response helpers
│       └── config/         # env validation · db connection
│
├── frontend/               # Dashboard UI (Next.js 14 / Tailwind CSS)
│   └── src/
│       ├── app/            # Next.js App Router pages
│       ├── components/
│       │   ├── dashboard/  # SensorPanel · AIPanel · StatusBadge
│       │   └── ui/         # Reusable primitives (Button, Card, Chart)
│       ├── hooks/          # useSensorData · useInsight
│       ├── lib/            # API client · formatters
│       ├── store/          # Zustand global state
│       └── types/          # TypeScript interfaces
│
├── infra/
│   ├── nginx/              # nginx.conf – reverse proxy config
│   └── scripts/            # deploy.sh · seed_db.sh
│
├── docs/
│   ├── architecture/       # Detailed architecture diagrams (C4 model)
│   └── api/                # OpenAPI 3.0 spec
│
├── docker-compose.yml      # Full-stack container orchestration
├── .env.example            # Environment variable template
└── README.md
```

---

## 4. AI Pipeline — RAG Architecture

```
User Request (Dashboard poll)
        │
        ▼
┌───────────────────┐
│  1. RETRIEVE      │  Query PostgreSQL for:
│                   │  • Last 24 h of sensor readings
│                   │  • Crop profile (type, stage, thresholds)
│                   │  • Historical drought events (knowledge base)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  2. ML AUGMENT    │  Call Python ML micro-service:
│                   │  • 24 / 48 / 72 h soil moisture forecast
│                   │  • Drought stress label (0–3)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  3. GENERATE      │  Build prompt for IBM watsonx.ai:
│                   │
│  System:          │  "You are AgriMind, an expert agronomist.
│                   │   Always respond in simple language a farmer
│                   │   with no technical background can understand.
│                   │   Current crop: {crop_type}, stage: {growth_stage}."
│                   │
│  Context (RAG):   │  Structured JSON — sensor snapshot, ML forecast,
│                   │  stress classification, threshold table.
│                   │
│  Task:            │  "Based on the data above, provide:
│                   │   1. One-sentence status summary.
│                   │   2. Up to 3 concrete actions for the next 24 h.
│                   │   3. Risk level if no action is taken."
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  4. DELIVER       │  Stream LLM response → WebSocket → AI Panel
└───────────────────┘
```

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Hardware | ESP32 + DHT22 + Capacitive Soil Sensor | Field telemetry node |
| Protocol | MQTT / HTTP POST | Data ingestion to backend |
| ML | Python 3.11, scikit-learn, pandas | Soil moisture forecasting |
| Backend | Node.js 20, Express 4, Prisma ORM | API server & AI orchestrator |
| LLM | IBM watsonx.ai (Granite 13B Chat v2) | Natural-language insights |
| Database | PostgreSQL 16 | Time-series sensor storage |
| Frontend | Next.js 14, React 18, Tailwind CSS, Recharts | Dashboard UI |
| Infra | Docker, docker-compose, Nginx | Containerised deployment |
| Auth | JWT (RS256) | Farmer / admin role separation |

---

## 6. Quick Start

### Prerequisites
- Docker Desktop ≥ 24
- IBM watsonx.ai API key ([Get one here](https://cloud.ibm.com/catalog/services/watsonx-ai))

### 1. Clone & configure

```bash
git clone https://github.com/your-org/agrimind.git
cd agrimind
cp .env.example .env
# Edit .env — add IBM_WATSONX_API_KEY and IBM_PROJECT_ID
```

### 2. Start the full stack

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Dashboard | http://localhost |
| Backend API | http://localhost:4000 |
| ML Service | http://localhost:5001 (internal) |

### 3. Flash the ESP32

Open `hardware/` in PlatformIO, update `include/config.h` with your WiFi SSID and backend URL, then upload.

---

## 7. API Reference (Summary)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ingest` | Receive sensor payload from ESP32 |
| `GET` | `/api/v1/predict/:deviceId` | Get ML forecast for a device |
| `GET` | `/api/v1/insight/:deviceId` | Get LLM recommendation (SSE stream) |
| `GET` | `/api/v1/devices` | List all registered field devices |
| `GET` | `/health` | Backend liveness probe |

Full OpenAPI 3.0 specification: [`docs/api/openapi.yaml`](docs/api/)

---

## 8. Roadmap

- [x] Monorepo scaffold & Docker orchestration
- [ ] ESP32 firmware with WiFi + MQTT
- [ ] Python ML training pipeline & prediction API
- [ ] Node.js ingestion + RAG orchestration layer
- [ ] Next.js two-panel dashboard with real-time charts
- [ ] IBM watsonx.ai Granite integration
- [ ] Multi-farm / multi-device support
- [ ] Mobile-responsive PWA
- [ ] Bahasa Indonesia localisation

---

## 9. Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) and ensure all tests pass before opening a PR.

---

## 10. License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

Built for the **IBM Hackathon** · Powered by **IBM watsonx.ai**

*"From soil data to smart decisions — in the language of every farmer."*

</div>
