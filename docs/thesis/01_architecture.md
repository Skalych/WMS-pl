# 1. Architektura systemu WMS Nexus

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-08-30_

## 1.1. Przeznaczenie systemu

WMS Nexus — system zarządzania magazynem z kompletacją falową (wave batch picking), monitoringiem pracowników w czasie rzeczywistym, ewidencją stanów magazynowych i symulacją operacji magazynowych.

## 1.2. Stos technologiczny

| Warstwa | Technologie |
|---------|-------------|
| Frontend (panel) | React 18, TypeScript, Vite, vanilla CSS |
| Terminal mobilny | Android (Kotlin, Jetpack Compose), skaner Zebra — `android/` |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Baza danych | PostgreSQL 16 |
| Autoryzacja | JWT + RBAC (`token_version` w payload) |
| Infrastruktura | Docker Compose (`docker-compose.yml` dev, `docker-compose.prod.yml` prod), nginx (SPA + reverse proxy API/WS) |

## 1.3. Architektura wysokiego poziomu

```
[Przeglądarka] → [Frontend Vite / nginx] ──proxy──→ [FastAPI REST + WebSocket]
[Android terminal] ───────────────────────────────→         ↓
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
| `frontend/src/pages/` | Strony UI panelu administracyjnego |
| `frontend/src/api/` | Klient API |
| `android/app/src/main/java/com/wms/terminal/` | Aplikacja terminala kompletacji (Android) |
| `docker-compose.prod.yml` | Stos produkcyjny: Postgres + backend + frontend/nginx |

## 1.5. Wzorce architektoniczne

- **Router → Service → Model** — rozdzielenie warstwy HTTP i logiki biznesowej.
- **Async SQLAlchemy** — nieblokujące zapytania do PostgreSQL.
- **WebSocket** — aktualizacje zmiany na żywo (`shift_ws`).
- **Alembic** — wersjonowanie schematu BD.

## 1.6. Interakcja komponentów

Główny przepływ kompletacji fali:

1. **Inbound** — przyjęcie towaru, putaway → `inventory_balances`.
2. **Orders / Waves** — tworzenie fali z rezerwacją stanów (`reserved_quantity`, partial waves) → `micro_tasks`.
3. **Packer** — generowanie kodów kontenerów (`issued_container_labels`) do druku.
4. **Terminal (Android)** — claim zadania, sesja `pick_sessions`, skan kontenera → lokalizacja → SKU → ilość → bufor.
5. **Shift live** — WebSocket (`shift_ws`) publikuje metryki zmiany po operacjach pickera.

_[TODO: doprecyzować diagram dla sortowania i dispatch po buforze]_
