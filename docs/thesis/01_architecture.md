# 1. Architektura systemu WMS Nexus

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-31

## 1.1. Przeznaczenie systemu

WMS Nexus — system zarządzania magazynem z kompletacją falową (wave batch picking), monitoringiem pracowników w czasie rzeczywistym, ewidencją stanów magazynowych i symulacją operacji magazynowych.

## 1.2. Stos technologiczny

| Warstwa | Technologie |
|---------|-------------|
| Frontend | React 18, TypeScript, Vite, vanilla CSS |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Baza danych | PostgreSQL 16 |
| Autoryzacja | JWT + RBAC |
| Infrastruktura | Docker Compose (dev: Postgres; prod: `docker-compose.prod.yml` — Postgres + backend + nginx SPA) |
| i18n (frontend) | react-i18next (`frontend/src/i18n.ts`) |

## 1.3. Architektura wysokiego poziomu

```
[Przeglądarka / terminal magazynowy]
        ↓
[Frontend: Vite (dev) | nginx SPA (prod, proxy /api/ → backend)]
        ↓
[FastAPI REST + WebSocket]  ←  routers: auth, users, waves, terminal, packer, …
        ↓
[PostgreSQL 16]
```

W środowisku produkcyjnym (`docker-compose.prod.yml`) nginx serwuje statyczne pliki SPA, proxy'uje `/api/` do kontenera backendu oraz WebSocket `/api/v1/ws/` (live-board zmiany). Konfiguracja: `frontend/nginx.conf`.

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
- **WebSocket** — aktualizacje zmiany na żywo (`shift_ws`).
- **Alembic** — wersjonowanie schematu BD.

## 1.6. Interakcja komponentów

Główny przepływ operacyjny:

1. **Inbound** — przyjęcie towaru (`inbound` → `inventory_service`: RECEIPT, PUTAWAY).
2. **Orders** — zamówienia oczekujące na alokację (`OrderStatus.PENDING` / `PARTIALLY_IN_WAVE`).
3. **Waves** — tworzenie fali rezerwuje stany (`inventory_service.reserve_stock`), generuje `MicroTask` / `MicroTaskItem`.
4. **Packer** — druk etykiet kontenerów (`IssuedContainerLabel`); picker skanuje kod przy starcie sesji.
5. **Terminal** — `PickSession` prowadzi krok po kroku (skan kontenera → lokalizacja → SKU → ilość → bufor).
6. **Dashboard / shift_ws** — monitoring pracowników i zdarzeń zmiany w czasie rzeczywistym.

_[TODO: dodać diagram sekwencji UML dla pełnego cyklu zamówienia]_
