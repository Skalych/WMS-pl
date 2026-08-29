# 4. Bezpieczeństwo i role (RBAC)

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-29

## 4.1. Model autoryzacji

- **Tokeny JWT** — wydawane przy logowaniu (`routers/auth.py`); payload: `sub`, `role`, `tv` (token_version).
- **Bearer token** — przekazywany w nagłówku `Authorization`.
- **SECRET_KEY** — wymagany z env (brak domyślnej wartości); podpis HS256 (`core/config.py`, `core/security.py`).
- **token_version** — pole `users.token_version`; inkrementowane przy `change_password`; `get_current_user` odrzuca tokeny ze starą wersją (`core/deps.py`).

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
| Rate limiting | `core/rate_limit.py` | In-memory limiter logowania (`LOGIN_RATE_LIMIT`/min, domyślnie 10); HTTP 429 |
| CORS | `main.py` | Allowlist z `CORS_ORIGINS` (JSON w env); domyślnie localhost:3000/5173 |
| Seed guard | `core/seed_guard.py` | Blokada `seed.py` bez `ALLOW_SEED=1`; odmowa w `APP_ENV=production` |
| Symulacja | `core/config.py` | Domyślnie wyłączona w production (`SIMULATION_ENABLED`); toggle runtime w dashboard |

## 4.5. WebSocket

`shift_ws.py` — weryfikacja roli ADMIN_MANAGER przed połączeniem z live-boardem.
