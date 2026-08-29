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
| Infrastruktura | Docker Compose (dev: Postgres; prod: `docker-compose.prod.yml`), nginx (SPA + proxy API), skrypt `wms.command` |
| CI | GitHub Actions — pytest, typecheck/build, docker build |

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

## 1.5. Wzorce architektoniczne

- **Router → Service → Model** — rozdzielenie warstwy HTTP i logiki biznesowej.
- **Async SQLAlchemy** — nieblokujące zapytania do PostgreSQL.
- **WebSocket** — aktualizacje zmiany na żywo (`shift_ws`).
- **Alembic** — wersjonowanie schematu BD.

## 1.6. Interakcja komponentów

Przepływ operacyjny:

1. **Inbound** — przyjęcie towaru (`inbound_service`) → zapis w `inventory_balances`.
2. **Orders / Waves** — alokacja pozycji zamówień do fali (`wave_service`), rezerwacja stanów (`inventory_service.reserve_stock`).
3. **Terminal** — kompletacja przez pickera (`terminal_service`), skan → `commit_pick`.
4. **Shift live** — WebSocket (`shift_ws`) publikuje status pracowników po operacjach terminala.
5. **Warehouse shifts & reports** — okno zmiany magazynowej (`warehouse_shift_service`), metryki (`shift_metrics_service`), eksport PDF/DOCX/HTML (`report_export_service`).

Skrypt `wms.command` uruchamia stack dev/prod (Postgres, backend, frontend) bez Makefile.

_[TODO: doprecyzować diagram przepływów inbound → inventory → waves → terminal]_
