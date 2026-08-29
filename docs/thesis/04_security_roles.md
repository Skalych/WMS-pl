# 4. Bezpieczeństwo i role (RBAC)

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-29

## 4.1. Model autoryzacji

- **Tokeny JWT** — wydawane przy logowaniu (`routers/auth.py`, `terminal_service.terminal_login`).
- **Bearer token** — przekazywany w nagłówku `Authorization`.
- **token_version** (`users.token_version`, claim `tv` w JWT) — unieważnianie sesji przy zmianie hasła/roli (`user_service.bump_token_version`).
- **SECRET_KEY** — wymagany w zmiennych środowiskowych (brak domyślnej wartości); podpis HS256.

## 4.2. Role użytkowników (UserRole)

| Rola | Enum | Typowy dostęp |
|------|------|---------------|
| Admin Manager | `ADMIN_MANAGER` | Pełny dostęp, panel administracyjny |
| Picker | `PICKER` | Terminal kompletacji |
| Inbound Operator | `INBOUND_OPERATOR` | Przyjęcia, inventory |
| Packer / Dispatcher | `PACKER_DISPATCHER` | Pakowanie, etykiety kontenerów (`/packer/*`) |

Zob. `backend/app/models/enums.py` oraz `backend/app/core/deps.py` (`require_roles`).

## 4.3. Weryfikacja uprawnień

- `get_current_user` — uwierzytelnianie na podstawie JWT.
- `require_roles(...)` — ograniczenie endpointów według ról.
- Przykład: `terminal.py` — dostęp dla PICKER, PACKER_DISPATCHER, ADMIN_MANAGER.
- Przykład: `packer.py` — dostęp dla PACKER_DISPATCHER, ADMIN_MANAGER.

## 4.4. Dodatkowe mechanizmy

| Mechanizm | Plik | Opis |
|-----------|------|------|
| Rate limiting | `core/rate_limit.py` | Limit logowań (`LOGIN_RATE_LIMIT`, domyślnie 10/min/IP); `/auth/login`, `/terminal/login` |
| CORS | `main.py`, `core/config.py` | Allowlista `CORS_ORIGINS` (JSON w env) |
| Seed guard | `core/seed_guard.py` | Blokada `seed` w `APP_ENV=production`; wymaga `ALLOW_SEED=1` |
| Symulacja prod | `core/config.py` | `SIMULATION_ENABLED` domyślnie off w production |

## 4.5. WebSocket

`shift_ws.py` — weryfikacja roli ADMIN_MANAGER przed połączeniem z live-boardem; sprawdzanie `token_version` w payload JWT (jak w `deps.get_current_user`).
