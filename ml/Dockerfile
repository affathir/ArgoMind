# =============================================================================
#  AgriMind ML Service – Docker build
#  Stage 1: train model on startup
#  Stage 2: serve Flask prediction API on port 5001
# =============================================================================
FROM python:3.11-slim AS base

WORKDIR /app

# System deps for numpy/scikit-learn
RUN apt-get update && apt-get install -y --no-install-recommends \
      gcc libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY src/  ./src/
COPY data/ ./data/

# Model output directory (mapped to named volume in docker-compose)
RUN mkdir -p /app/models

ENV MODEL_OUTPUT_DIR=/app/models
ENV FLASK_APP=src/app.py
ENV FLASK_ENV=production
ENV PORT=5001

EXPOSE 5001

# On container start: train the model (idempotent), then serve
CMD ["sh", "-c", "python src/train.py && gunicorn --bind 0.0.0.0:5001 --workers 2 --timeout 60 src.app:app"]
