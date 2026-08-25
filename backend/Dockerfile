# WMS Backend — FastAPI + asyncpg + WeasyPrint
# Build:  docker build -t wms-backend ./backend
# Run:    see docker-compose.prod.yml

FROM python:3.11-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System deps:
#   - libpango/libcairo/libgdk-pixbuf etc. — required by WeasyPrint (PDF reports)
#   - libpq5 — runtime lib for psycopg2
#   - curl — for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libharfbuzz0b \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        shared-mime-info \
        fonts-dejavu-core \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Non-root user
RUN useradd --create-home --uid 1000 wms && chown -R wms:wms /app
USER wms

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# Run migrations, then start the API.
# SECRET_KEY / POSTGRES_* / CORS_ORIGINS must be provided via environment.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]
