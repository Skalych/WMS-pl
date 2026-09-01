# 1. Architektura systemu WMS Nexus

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-09-01

## 1.1. Przeznaczenie systemu

WMS Nexus — system zarządzania magazynem z kompletacją falową (wave batch picking), monitoringiem pracowników w czasie rzeczywistym, ewidencją stanów magazynowych i symulacją operacji magazynowych.

## 1.2. Stos technologiczny

| Warstwa | Technologie |
|---------|-------------|
| Frontend web | React 18, TypeScript, Vite, vanilla CSS |
| Terminal mobilny | Kotlin, Jetpack Compose, Zebra DataWedge (`android/`) |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Baza danych | PostgreSQL 16 |
| Autoryzacja | JWT + RBAC |
| Infrastruktura | Docker Compose (`docker-compose.prod.yml`: Postgres + backend + nginx SPA) |

## 1.3. Architektura wysokiego poziomu

```
[Przeglądarka] → [Frontend Vite / nginx] ─┐
[Terminal Android] ────────────────────────┼→ [FastAPI REST + WebSocket] → [PostgreSQL]
```

## 1.4. Struktura repozytorium

| Katalog | Przeznaczenie |
|---------|---------------|
| `backend/app/routers/` | Trasy HTTP i WebSocket |
| `backend/app/services/` | Logika biznesowa |
| `backend/app/models/` | Modele ORM SQLAlchemy |
| `backend/app/schemas/` | Schematy Pydantic żądań/odpowiedzi |
| `backend/alembic/` | Migracje BD |
| `frontend/src/pages/` | Strony UI (m.in. Waves, PackerLabels, MyShift) |
| `frontend/src/api/` | Klient API |
| `android/app/` | Aplikacja terminala kompletacji (Zebra) |

## 1.5. Wzorce architektoniczne

- **Router → Service → Model** — rozdzielenie warstwy HTTP i logiki biznesowej.
- **Async SQLAlchemy** — nieblokujące zapytania do PostgreSQL.
- **Maszyna stanów sesji kompletacji** — kroki `PickStep` w `pick_session_service.py` (skan kontenera → lokalizacja → SKU → ilość → bufor).
- **WebSocket** — aktualizacje zmiany na żywo (`shift_ws`).
- **Alembic** — wersjonowanie schematu BD.

## 1.6. Interakcja komponentów

1. **Inbound** — przyjęcie towaru zwiększa `inventory_balances`.
2. **Orders + Waves** — `wave_service.create_wave` rezerwuje stany (`reserved_quantity`), tworzy `micro_tasks` i pozycje `micro_task_items` (w tym częściowe fale).
3. **Packer** — `container_service` generuje etykiety `issued_container_labels`; kontener powstaje dopiero po skanie pickera.
4. **Terminal** — picker przejmuje zadanie FIFO (`claim_task`), prowadzi sesję `pick_sessions`, `commit_pick` aktualizuje stany.
5. **Shift live** — WebSocket publikuje postęp po kompletacji (`publish_shift_live_update`).

_[TODO: doprecyzować diagram przepływów inbound → inventory → waves → terminal]_
