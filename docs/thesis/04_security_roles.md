# 4. Bezpieczeństwo i role (RBAC)

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: **2026-08-29**

## 4.1. Model autoryzacji

- **Tokeny JWT** — wydawane przy logowaniu (`routers/auth.py`, `routers/terminal.py`).
- **Bearer token** — przekazywany w nagłówku `Authorization`.
- **Claims** — `sub` (user ID), `role`, `tv` (token_version).
- **token_version** — pole `users.token_version`; inkrementowane przy `change_password`; token z nieaktualnym `tv` jest odrzucany w `get_current_user` i WebSocket.
- **SECRET_KEY** — wymagany w zmiennych środowiskowych (brak domyślnej wartości); używany do podpisu JWT (`core/config.py`).

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
| Rate limiting | `core/rate_limit.py` | Limit logowań: `LOGIN_RATE_LIMIT` (domyślnie 10/min/IP); wyłączalny przez `RATE_LIMIT_ENABLED` |
| CORS | `main.py`, `core/config.py` | Allowlista `CORS_ORIGINS` (JSON w env); w prod domyślnie `[]` (same-origin przez nginx) |
| Seed guard | `core/seed_guard.py` | Blokada `seed.py` bez `ALLOW_SEED=1`; odmowa przy `APP_ENV=production` |
| Nagłówki HTTP | `frontend/nginx.conf` | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` |

## 4.5. WebSocket

`shift_ws.py` — token JWT w query param `token`; weryfikacja roli `ADMIN_MANAGER` oraz zgodności `tv` z `users.token_version` przed połączeniem z live-boardem.
