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
| Infrastruktura | Docker Compose (dev: Postgres; prod: `docker-compose.prod.yml` — Postgres + backend + nginx SPA), TLS-ready |

## 1.3. Architektura wysokiego poziomu

```
[Przeglądarka / terminal] → [Frontend Vite] → [FastAPI REST + WebSocket]
                                                      ↓
                                                [PostgreSQL]
```

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
| `frontend/src/pages/PackerLabels.tsx` | Generowanie etykiet kontenerów (packer) |
| `frontend/src/pages/ShiftReportsPage.tsx` | Lista raportów zmian magazynowych |

## 1.5. Wzorce architektoniczne

- **Router → Service → Model** — rozdzielenie warstwy HTTP i logiki biznesowej.
- **Async SQLAlchemy** — nieblokujące zapytania do PostgreSQL.
- **WebSocket** — aktualizacje zmiany na żywo (`shift_ws`).
- **Alembic** — wersjonowanie schematu BD.

## 1.6. Interakcja komponentów

Główny przepływ operacyjny:

1. **Inbound** → przyjęcie towaru, aktualizacja `InventoryBalance`.
2. **Orders** → zamówienia oczekujące na alokację.
3. **Waves** → tworzenie fali z rezerwacją stanów (`reserved_quantity`), podział na micro-tasks.
4. **Packer** (`/packer/containers/generate`) → druk etykiet kontenerów (`IssuedContainerLabel`).
5. **Terminal** (`pick_session_service`) → picker claimuje zadanie FIFO, skanuje etykietę kontenera, lokalizację, SKU, potwierdza ilość, skanuje bufor.
6. **Dashboard / shift_ws** → monitoring zmiany w czasie rzeczywistym.

Symulacja magazynu (`simulation_service`) domyślnie wyłączona w `APP_ENV=production`; włączana runtime przez panel admina.
