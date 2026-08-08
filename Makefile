.PHONY: seed start-backend start-frontend

seed:
	cd backend && source .venv/bin/activate && python -m app.seed

start-backend:
	cd backend && source .venv/bin/activate && fastapi run app/main.py

start-frontend:
	cd frontend && npm run dev
