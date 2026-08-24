.PHONY: seed start-backend start-frontend start-all stop-apps stop-all status test install

ROOT := $(shell pwd)

seed:
	docker compose up -d
	@echo "Waiting for PostgreSQL..."
	@sleep 3
	cd backend && source .venv/bin/activate && ALLOW_SEED=1 python -m app.seed

install:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

start-backend:
	cd backend && source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

start-frontend:
	cd frontend && npm run dev -- --host 0.0.0.0 --port 3000 --strictPort

start-all:
	docker compose up -d
	@echo "Waiting for PostgreSQL..."
	@sleep 3
	@mkdir -p .wms
	@cd backend && source .venv/bin/activate && nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 & echo $$! > $(ROOT)/.wms/backend.pid
	@cd frontend && nohup npm run dev -- --host 0.0.0.0 --port 3000 --strictPort > frontend.log 2>&1 & echo $$! > $(ROOT)/.wms/frontend.pid
	@echo "Started. Open http://localhost:3000"

stop-apps:
	-lsof -ti:3000 | xargs kill -9 2>/dev/null
	-lsof -ti:8000 | xargs kill -9 2>/dev/null
	-[ -f .wms/backend.pid ] && kill $$(cat .wms/backend.pid) 2>/dev/null; rm -f .wms/backend.pid
	-[ -f .wms/frontend.pid ] && kill $$(cat .wms/frontend.pid) 2>/dev/null; rm -f .wms/frontend.pid

stop-all: stop-apps
	docker compose down

status:
	@echo "PostgreSQL:" && docker compose ps postgres 2>/dev/null || echo "  not running"
	@curl -sf http://127.0.0.1:8000/health >/dev/null && echo "Backend:  OK (:8000)" || echo "Backend:  down"
	@curl -sf http://127.0.0.1:3000/ >/dev/null && echo "Frontend: OK (:3000)" || echo "Frontend: down"

test:
	cd backend && source .venv/bin/activate && pytest tests/ -v
