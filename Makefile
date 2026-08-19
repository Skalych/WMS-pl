.PHONY: seed start-backend start-frontend start-all stop-all

seed:
	cd backend && source .venv/bin/activate && python -m app.seed

start-backend:
	cd backend && source .venv/bin/activate && fastapi run app/main.py

start-frontend:
	cd frontend && npm run dev

start-all:
	docker compose up -d
	@echo "Waiting for PostgreSQL..."
	@sleep 3
	$(MAKE) start-backend &
	$(MAKE) start-frontend

stop-all:
	lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	lsof -ti:8000 | xargs kill -9 2>/dev/null || true
