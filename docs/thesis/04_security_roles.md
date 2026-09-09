# 4. Bezpieczeństwo i role (RBAC)

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-08-30_

## 4.1. Model autoryzacji

- **Tokeny JWT** — wydawane przy logowaniu (`routers/auth.py`, `routers/terminal.py`).
- **Bearer token** — przekazywany w nagłówku `Authorization`.
- **Payload** — `sub` (user id), `role`, `tv` (`token_version`).
- **SECRET_KEY** — wymagany z env (`core/config.py`); brak domyślnej wartości.
- **token_version** — inkrementacja przy `change_password`; tokeny ze starą `tv` odrzucane w `get_current_user`.

## 4.2. Role użytkowników (UserRole)

| Rola | Enum | Typowy dostęp |
|------|------|---------------|
| Admin Manager | `ADMIN_MANAGER` | Pełny dostęp, panel administracyjny |
| Picker | `PICKER` | Terminal kompletacji |
| Inbound Operator | `INBOUND_OPERATOR` | Przyjęcia, inventory |
| Packer / Dispatcher | `PACKER_DISPATCHER` | Pakowanie, dispatch |

Zob. `backend/app/models/enums.py` oraz `backend/app/core/deps.py` (`require_roles`).

## 4.3. Weryfikacja uprawnień

- `get_current_user` — uwierzytelnianie na podstawie JWT.
- `require_roles(...)` — ograniczenie endpointów według ról.
- Przykład: `terminal.py` — dostęp dla PICKER, PACKER_DISPATCHER, ADMIN_MANAGER.

## 4.4. Dodatkowe mechanizmy

| Mechanizm | Plik | Opis |
|-----------|------|------|
| Rate limiting | `core/rate_limit.py` | Limit logowania: `LOGIN_RATE_LIMIT` (domyślnie 10/min/IP); `enforce_login_rate_limit` na `/auth/login` i `/terminal/login` |
| CORS | `main.py`, `core/config.py` | Allowlista `CORS_ORIGINS` (JSON w env) |
| Seed guard | `core/seed_guard.py` | `ALLOW_SEED=1` + `APP_ENV≠production` wymagane do `seed.py` |
| Symulacja prod | `core/config.py` | `SIMULATION_ENABLED` domyślnie wyłączona gdy `APP_ENV=production` |
| nginx headers | `frontend/nginx.conf` | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` |

## 4.5. WebSocket

`shift_ws.py` — weryfikacja roli ADMIN_MANAGER przed połączeniem z live-boardem.
