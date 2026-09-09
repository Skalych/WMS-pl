# 1. Architektura systemu WMS Nexus

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-09-01_

## 1.1. Przeznaczenie systemu

WMS Nexus — system zarządzania magazynem z kompletacją falową (wave batch picking), monitoringiem pracowników w czasie rzeczywistym, ewidencją stanów magazynowych i symulacją operacji magazynowych.

## 1.2. Stos technologiczny

| Warstwa | Technologie |
|---------|-------------|
| Frontend | React 18, TypeScript, Vite, vanilla CSS |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Baza danych | PostgreSQL 16 |
| Autoryzacja | JWT + RBAC |
| Infrastruktura | Docker Compose (`docker-compose.prod.yml`: Postgres + backend + nginx SPA), reverse proxy API/WS |
| Terminal magazynowy | Android (handheld) + REST `/terminal/*` |

## 1.3. Architektura wysokiego poziomu

```
[Przeglądarka admin] → [nginx + SPA Vite] ──/api──→ [FastAPI REST + WebSocket]
[Terminal Android]  ───────────────────────────────→        ↓
                                                      [PostgreSQL]
```

W produkcji nginx serwuje statyczny frontend i proxy'uje `/api/` oraz WebSocket `/api/v1/ws/` do kontenera backendu (`frontend/nginx.conf`).

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
- **Maszyna stanów sesji kompletacji** — `PickSession` + enum `PickStep` w `pick_session_service.py` (skan kontenera → lokalizacja → SKU → ilość → bufor).
- **Rezerwacja stanów** — `inventory_service.reserve_stock` / `commit_pick` przy tworzeniu fali i kompletacji.

## 1.6. Interakcja komponentów

Główny przepływ operacyjny:

1. **Inbound** — przyjęcie towaru, aktualizacja `inventory_balances`.
2. **Orders → Waves** — alokacja częściowa (`allocated_quantity`), rezerwacja stanów, generowanie `MicroTask`.
3. **Packer** — druk etykiet kontenerów (`IssuedContainerLabel`) przez `/packer/containers/generate`.
4. **Terminal** — picker skanuje etykietę, przejmuje zadanie (FIFO), prowadzi sesję `PickSession` krok po kroku.
5. **Dashboard / shift_ws** — monitoring zmiany i raporty magazynowe.

_[TODO: doprecyzować diagram przepływów sortowania i dispatch]_
