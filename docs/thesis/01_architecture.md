# 1. Architektura systemu WMS Nexus

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-08-29_

## 1.1. Przeznaczenie systemu

WMS Nexus — system zarządzania magazynem z kompletacją falową (wave batch picking), monitoringiem pracowników w czasie rzeczywistym, ewidencją stanów magazynowych i symulacją operacji magazynowych.

## 1.2. Stos technologiczny

| Warstwa | Technologie |
|---------|-------------|
| Frontend web | React 18, TypeScript, Vite, vanilla CSS |
| Terminal mobilny | Android (Kotlin, Jetpack Compose), skaner Zebra DataWedge |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Baza danych | PostgreSQL 16 |
| Autoryzacja | JWT + RBAC (`token_version` w payloadzie) |
| Infrastruktura | Docker Compose (`docker-compose.yml` dev, `docker-compose.prod.yml` prod), nginx (SPA + reverse proxy API/WS) |

## 1.3. Architektura wysokiego poziomu

```
[Przeglądarka] → [nginx / Vite dev] ──proxy──→ [FastAPI REST + WebSocket]
[Terminal Android] ─────────────────────────────→       ↓
                                                [PostgreSQL]
```

Produkcja: `docker-compose.prod.yml` — Postgres + backend + frontend (nginx na porcie 80, proxy `/api/` i `/api/v1/ws/`).

## 1.4. Struktura repozytorium

| Katalog | Przeznaczenie |
|---------|---------------|
| `backend/app/routers/` | Trasy HTTP i WebSocket |
| `backend/app/services/` | Logika biznesowa |
| `backend/app/models/` | Modele ORM SQLAlchemy |
| `backend/app/schemas/` | Schematy Pydantic żądań/odpowiedzi |
| `backend/alembic/` | Migracje BD |
| `frontend/src/pages/` | Strony UI (m.in. `PackerLabels.tsx`, `ShiftReportsPage.tsx`) |
| `frontend/src/api/` | Klient API |
| `android/` | Aplikacja terminala kompletacji (Zebra) |
| `docker-compose.prod.yml` | Stos produkcyjny (Postgres, backend, nginx) |

## 1.5. Wzorce architektoniczne

- **Router → Service → Model** — rozdzielenie warstwy HTTP i logiki biznesowej.
- **Async SQLAlchemy** — nieblokujące zapytania do PostgreSQL.
- **WebSocket** — aktualizacje zmiany na żywo (`shift_ws`).
- **Alembic** — wersjonowanie schematu BD.

## 1.6. Interakcja komponentów

Główny przepływ operacyjny:

1. **Inbound** — przyjęcie towaru, aktualizacja `inventory_balances`.
2. **Orders → Waves** — tworzenie fali z częściową alokacją (`PARTIALLY_IN_WAVE`), rezerwacja stanów (`reserve_stock`).
3. **Packer** — generowanie etykiet kontenerów (`issued_container_labels`).
4. **Terminal (Android)** — sesja kompletacji (`pick_sessions`): skan kontenera → lokalizacja (kod 90XYZ) → SKU → ilość → bufor.
5. **Shift live** — WebSocket (`shift_ws`) dla panelu menedżera.

Symulacja magazynu (`simulation_service`) domyślnie wyłączona w `APP_ENV=production`; przełącznik runtime w `/dashboard/simulation/toggle`.
