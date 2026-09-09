# 1. Architektura systemu WMS Nexus

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-29

## 1.1. Przeznaczenie systemu

WMS Nexus — system zarządzania magazynem z kompletacją falową (wave batch picking), monitoringiem pracowników w czasie rzeczywistym, ewidencją stanów magazynowych i symulacją operacji magazynowych.

## 1.2. Stos technologiczny

| Warstwa | Technologie |
|---------|-------------|
| Frontend | React 18, TypeScript, Vite, vanilla CSS |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Baza danych | PostgreSQL 16 |
| Autoryzacja | JWT + RBAC |
| Infrastruktura | Docker Compose (dev: Postgres), `docker-compose.prod.yml` (Postgres + backend + nginx SPA) |

## 1.3. Architektura wysokiego poziomu

```
[Przeglądarka / terminal] → [Frontend Vite (dev) / nginx SPA (prod)] → [FastAPI REST + WebSocket]
                                                                              ↓
                                                                        [PostgreSQL 16]
```

W produkcji (`docker-compose.prod.yml`) nginx (`frontend/nginx.conf`) serwuje SPA, proxy `/api/` → backend:8000 oraz WebSocket `/api/v1/ws/` (timeout 3600 s). Konfiguracja TLS — [TODO: doprecyzować] (obecnie port 80).

## 1.4. Struktura repozytorium

| Katalog | Przeznaczenie |
|---------|---------------|
| `backend/app/routers/` | Trasy HTTP i WebSocket |
| `backend/app/services/` | Logika biznesowa |
| `backend/app/models/` | Modele ORM SQLAlchemy |
| `backend/app/schemas/` | Schematy Pydantic żądań/odpowiedzi |
| `backend/alembic/` | Migracje BD |
| `frontend/src/pages/` | Strony UI |
| `frontend/src/api/` | Klient API |

## 1.5. Wzorce architektoniczne

- **Router → Service → Model** — rozdzielenie warstwy HTTP i logiki biznesowej.
- **Async SQLAlchemy** — nieblokujące zapytania do PostgreSQL.
- **WebSocket** — monitoring zmiany magazynowej na żywo (`shift_ws.py`, endpoint `/api/v1/ws/shift-live`); frontend z fallbackiem polling co 15 s (`useShiftLive.ts`).
- **Alembic** — wersjonowanie schematu BD.
- **Konteneryzacja prod** — `backend/Dockerfile` (alembic upgrade + uvicorn, 2 workers), `frontend/Dockerfile` (multi-stage build → nginx).
- **Symulacja magazynu** — `simulation_service.py`; domyślnie wyłączona w `APP_ENV=production` (`config.py`, commit `0a7a636`).

## 1.6. Interakcja komponentów

_[TODO: dodać diagram przepływów dla inbound → inventory → waves → terminal]_
