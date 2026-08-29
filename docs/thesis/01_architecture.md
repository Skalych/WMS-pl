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
| Infrastruktura | Docker Compose (`docker-compose.yml` dev, `docker-compose.prod.yml` prod), nginx (SPA + reverse proxy API/WS) |

## 1.3. Architektura wysokiego poziomu

```
[Przeglądarka / terminal] → [nginx :80] → [Frontend Vite SPA]
                              ↓ /api/, /api/v1/ws/
                         [FastAPI REST + WebSocket]
                              ↓
                         [PostgreSQL 16]
```

W środowisku produkcyjnym (`docker-compose.prod.yml`) nginx serwuje statyczne pliki SPA, proxy'uje `/api/` do kontenera backendu oraz WebSocket pod `/api/v1/ws/` (konfiguracja: `frontend/nginx.conf`).

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
- **Ustawienia runtime** — tabela `app_settings` (np. przełącznik symulacji) zarządzana przez `app_settings_service.py`.

## 1.6. Interakcja komponentów

_[TODO: dodać diagram przepływów dla inbound → inventory → waves → terminal]_
