#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  ArgoMind — Quick Start Script  (macOS / Linux)
#  Usage: bash start.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}"
echo "  █████╗ ██████╗  ██████╗  ██████╗ ███╗   ███╗██╗███╗   ██╗██████╗ "
echo " ██╔══██╗██╔══██╗██╔════╝ ██╔═══██╗████╗ ████║██║████╗  ██║██╔══██╗"
echo " ███████║██████╔╝██║  ███╗██║   ██║██╔████╔██║██║██╔██╗ ██║██║  ██║"
echo " ██╔══██║██╔══██╗██║   ██║██║   ██║██║╚██╔╝██║██║██║╚██╗██║██║  ██║"
echo " ██║  ██║██║  ██║╚██████╔╝╚██████╔╝██║ ╚═╝ ██║██║██║ ╚████║██████╔╝"
echo " ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ "
echo -e "${NC}"
echo "  Smart Farming IoT Dashboard — Docker Quick Start"
echo ""

# ── 1. Check Docker ───────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo -e "${RED}[ERROR] Docker is not installed.${NC}"
  echo "  → Install from https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version &>/dev/null; then
  echo -e "${RED}[ERROR] Docker Compose plugin not found.${NC}"
  echo "  → Make sure you have Docker Desktop or the Compose plugin installed."
  exit 1
fi

# ── 2. Prepare .env ───────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}[SETUP] .env not found — copying from .env.docker.example${NC}"
  cp .env.docker.example .env
  echo ""
  echo -e "${YELLOW}  ⚠  Please edit .env and fill in your API keys, then re-run this script.${NC}"
  echo "     Required keys:"
  echo "       GOOGLE_API_KEY        → https://aistudio.google.com/app/apikey"
  echo "       OPENWEATHER_API_KEY   → https://openweathermap.org/api"
  echo "       TELEGRAM_BOT_TOKEN    → via @BotFather on Telegram"
  echo ""
  exit 0
fi

# ── 3. Start services ─────────────────────────────────────────────────────────
echo -e "${GREEN}[START] Building and starting all services…${NC}"
docker compose up --build -d

echo ""
echo -e "${GREEN}✅  ArgoMind is running!${NC}"
echo ""
echo "  Dashboard  →  http://localhost:3000"
echo "  API docs   →  http://localhost:8000/docs"
echo "  MQTT       →  localhost:1883"
echo ""
echo "  Logs:  docker compose logs -f"
echo "  Stop:  docker compose down"
