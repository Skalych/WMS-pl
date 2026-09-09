# 1. Architektura systemu WMS Nexus

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-30

## 1.1. Przeznaczenie systemu

WMS Nexus — system zarządzania magazynem z kompletacją falową (wave batch picking), monitoringiem pracowników w czasie rzeczywistym, ewidencją stanów magazynowych i symulacją operacji magazynowych.

## 1.2. Stos technologiczny

| Warstwa | Technologie |
|---------|-------------|
| Frontend web | React 18, TypeScript, Vite, vanilla CSS |
| Terminal magazynowy | Android (Kotlin, Jetpack Compose) — `android/` |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Baza danych | PostgreSQL 16 |
| Autoryzacja | JWT + RBAC |
| Infrastruktura | Docker Compose (`docker-compose.yml` dev, `docker-compose.prod.yml` prod), nginx (SPA + reverse proxy API/WS) |

## 1.3. Architektura wysokiego poziomu

```
[Przeglądarka] → [Frontend Vite / nginx] ─┐
[Terminal Android] ───────────────────────┼→ [FastAPI REST + WebSocket] → [PostgreSQL]
                                          └─ /api/v1 (proxy w prod)
```

## 1.4. Struktura repozytorium

| Katalog | Przeznaczenie |
|---------|---------------|
| `backend/app/routers/` | Trasy HTTP i WebSocket |
| `backend/app/services/` | Logika biznesowa |
| `backend/app/models/` | Modele ORM SQLAlchemy |
| `backend/app/schemas/` | Schematy Pydantic żądań/odpowiedzi |
| `backend/alembic/` | Migracje BD |
| `frontend/src/pages/` | Strony UI (m.in. Waves, PackerLabels, ShiftReports) |
| `frontend/src/api/` | Klient API |
| `android/app/src/main/java/com/wms/terminal/` | Aplikacja terminala (Compose, skaner Zebra) |
| `docker-compose.prod.yml` | Stos produkcyjny: Postgres + backend + frontend (nginx) |

## 1.5. Wzorce architektoniczne

- **Router → Service → Model** — rozdzielenie warstwy HTTP i logiki biznesowej.
- **Async SQLAlchemy** — nieblokujące zapytania do PostgreSQL.
- **WebSocket** — aktualizacje zmiany na żywo (`shift_ws`).
- **Alembic** — wersjonowanie schematu BD.
- **Maszyna stanów sesji kompletacji** — `PickStep` w `pick_session_service.py` (skan kontenera → lokalizacja → SKU → ilość → bufor).
- **Reverse proxy nginx** — w produkcji frontend serwuje SPA i proxy `/api/` oraz WebSocket do backendu (`frontend/nginx.conf`).

## 1.6. Interakcja komponentów

_[TODO: dodać diagram przepływów dla inbound → inventory → waves → terminal]_
