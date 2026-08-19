# WMS Nexus

Warehouse Management System with wave batch picking, real-time worker monitoring, inventory management, and warehouse simulation.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, vanilla CSS |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Database | PostgreSQL 16 |
| Auth | JWT + role-based access control |

## Prerequisites

- Docker (for PostgreSQL)
- Python 3.9+
- Node.js 18+

## Quick Start (macOS — recommended)

Double-click **`wms.command`** or run:

```bash
./wms.command
```

| Menu | Action |
|------|--------|
| **[1] Запустити систему** | Docker + Backend (auto-reload) + Frontend → http://localhost:3000 |
| **[2] Seed бази** | Наповнити demo-даними (перший запуск або якщо логін не працює) |
| **[3] Зупинити сервери** | Backend + Frontend (PostgreSQL лишається) |
| **[4] Зупинити все** | Включно з Docker |
| **[5] Статус** | Перевірка що працює |
| **[6] Логи** | backend.log / frontend.log |
| **[7] Тести** | pytest (33 tests) |

Сервіси працюють **у фоні** — можна закрити вікно терміналу після запуску.

### Manual start

```bash
make install    # перший раз
make seed       # перший раз
make start-all  # або окремо start-backend / start-frontend
make status     # перевірка
make stop-apps  # зупинка
```

## Demo Credentials

All seeded users share password: **`password123`**

| Email | Role |
|-------|------|
| `admin@wms.local` | Admin Manager |
| `ivan.p@wms.local` | Picker |
| `oleg.d@wms.local` | Inbound Operator |
| `anna.s@wms.local` | Packer / Dispatcher |

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://127.0.0.1:8000 |
| Swagger docs | http://127.0.0.1:8000/docs |

## Running Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

Tests use in-memory SQLite — PostgreSQL is not required for the test suite.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_SERVER` | `localhost` | DB host |
| `POSTGRES_PORT` | `5432` | DB port |
| `POSTGRES_USER` | `postgres` | DB user |
| `POSTGRES_PASSWORD` | `postgres` | DB password |
| `POSTGRES_DB` | `wms_db` | Database name |
| `SECRET_KEY` | (see config) | JWT signing key |
| `VITE_API_URL` | `http://127.0.0.1:8000/api/v1` | Frontend API base URL |

## API Auth

Protected endpoints require `Authorization: Bearer <token>`.

```bash
# Login
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wms.local","password":"password123"}'

# Get current user profile
curl http://127.0.0.1:8000/api/v1/users/me \
  -H "Authorization: Bearer <token>"
```

## Project Structure

```
WMS/
├── backend/          # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── routers/  # API endpoints
│   │   ├── services/ # Business logic
│   │   └── models/   # ORM models
│   └── tests/        # pytest suite
├── frontend/         # React SPA
├── docker-compose.yml
└── Makefile
```

## Role Permissions (Phase 1)

| Role | Access |
|------|--------|
| `ADMIN_MANAGER` | Full access |
| `INBOUND_OPERATOR` | Inbound shipments, read inventory |
| `PICKER` | Terminal API, read orders/waves/inventory |
| `PACKER_DISPATCHER` | Terminal API, read orders/waves/inventory |

## Phase 2 Features

- **Stock reservation** — creating a wave reserves inventory (`reserved_quantity`)
- **Inbound UI** — `/inbound` page to create and receive shipments
- **Inventory audit trail** — `GET /api/v1/inventory/transactions`
- **Pick commit** — terminal scan decrements stock and logs transactions
