@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  ArgoMind — Quick Start Script  (Windows)
REM  Double-click start.bat  OR  run from Command Prompt / PowerShell
REM ─────────────────────────────────────────────────────────────────────────────
title ArgoMind Quick Start
chcp 65001 >nul

echo.
echo   ^█████╗ ██████╗  ██████╗  ██████╗ ███╗   ███╗██╗███╗   ██╗██████╗
echo  ██╔══██╗██╔══██╗██╔════╝ ██╔═══██╗████╗ ████║██║████╗  ██║██╔══██╗
echo  ███████║██████╔╝██║  ███╗██║   ██║██╔████╔██║██║██╔██╗ ██║██║  ██║
echo  ██╔══██║██╔══██╗██║   ██║██║   ██║██║╚██╔╝██║██║██║╚██╗██║██║  ██║
echo  ██║  ██║██║  ██║╚██████╔╝╚██████╔╝██║ ╚═╝ ██║██║██║ ╚████║██████╔╝
echo  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝
echo.
echo   Smart Farming IoT Dashboard — Docker Quick Start
echo.

REM ── 1. Check Docker ──────────────────────────────────────────────────────────
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed.
    echo    ^→ Install from https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

docker compose version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Compose plugin not found.
    echo    ^→ Make sure Docker Desktop is installed and running.
    pause
    exit /b 1
)

REM ── 2. Prepare .env ──────────────────────────────────────────────────────────
if not exist ".env" (
    echo [SETUP] .env not found — copying from .env.docker.example
    copy ".env.docker.example" ".env" >nul
    echo.
    echo   ^^!  Please edit .env and fill in your API keys, then re-run this script.
    echo      Required keys:
    echo        GOOGLE_API_KEY        ^→ https://aistudio.google.com/app/apikey
    echo        OPENWEATHER_API_KEY   ^→ https://openweathermap.org/api
    echo        TELEGRAM_BOT_TOKEN    ^→ via @BotFather on Telegram
    echo.
    echo   Opening .env in Notepad...
    notepad .env
    echo   After saving .env, run start.bat again.
    pause
    exit /b 0
)

REM ── 3. Start services ────────────────────────────────────────────────────────
echo [START] Building and starting all services...
docker compose up --build -d

echo.
echo   ^✅  ArgoMind is running!
echo.
echo   Dashboard  ^→  http://localhost:3000
echo   API docs   ^→  http://localhost:8000/docs
echo   MQTT       ^→  localhost:1883
echo.
echo   Logs:  docker compose logs -f
echo   Stop:  docker compose down
echo.
pause
