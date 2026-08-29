# 4. Bezpieczeństwo i role (RBAC)

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-08-29_

## 4.1. Model autoryzacji

- **Tokeny JWT** — wydawane przy logowaniu (`routers/auth.py`, `terminal/login`); payload: `sub`, `role`, `tv` (token_version).
- **Bearer token** — przekazywany w nagłówku `Authorization`.
- **token_version** — kolumna `users.token_version`; inkrementacja unieważnia wszystkie wcześniejsze tokeny (`deps.get_current_user` porównuje `tv` z JWT).
- **SECRET_KEY** — wymagany w zmiennych środowiskowych (brak domyślnej wartości); podpis HS256.

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
- Przykład: `terminal.py` — `TERMINAL_ACCESS`: PICKER, PACKER_DISPATCHER, ADMIN_MANAGER.
- `packer.py` — `PACKER_ACCESS`: PACKER_DISPATCHER, ADMIN_MANAGER.
- `waves.py` — anulowanie fali: tylko ADMIN_MANAGER.

## 4.4. Dodatkowe mechanizmy

| Mechanizm | Plik | Opis |
|-----------|------|------|
| Rate limiting logowania | `core/rate_limit.py` | `enforce_login_rate_limit` — max `LOGIN_RATE_LIMIT` (domyślnie 10) prób/min na IP; `/auth/login` i `/terminal/login` |
| CORS | `main.py`, `config.CORS_ORIGINS` | Dozwolone originy z konfiguracji (JSON w env); w prod często pusta lista (same-origin przez nginx) |
| Seed guard | `core/seed_guard.py` | Blokada `seed` bez `ALLOW_SEED=1`; zakaz w `APP_ENV=production` |
| Nagłówki nginx | `frontend/nginx.conf` | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` |

## 4.5. WebSocket

`shift_ws.py` — weryfikacja roli ADMIN_MANAGER przed połączeniem z live-boardem.
