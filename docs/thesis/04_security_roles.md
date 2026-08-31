# 4. Bezpieczeństwo i role (RBAC)

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-31

## 4.1. Model autoryzacji

- **Tokeny JWT** — wydawane przy logowaniu (`routers/auth.py`, `terminal_service.terminal_login`).
- **Bearer token** — przekazywany w nagłówku `Authorization`.
- **token_version** (`users.token_version`) — pole `tv` w payload JWT; przy każdej zmianie hasła lub roli (`user_service`) wersja jest inkrementowana, co unieważnia wcześniejsze tokeny (`deps.get_current_user`).

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
| Rate limiting | `core/rate_limit.py` | Limit logowań (domyślnie 10/min/IP); `/auth/login` i `/terminal/login` |
| CORS | `main.py` | Polityka cross-origin (`settings.CORS_ORIGINS`) |
| Seed guard | `core/seed_guard.py` | Blokada `seed` w `APP_ENV=production` bez `ALLOW_SEED=1` |
| Symulacja | `config.py`, `app_settings_service.py` | Domyślnie wyłączona w produkcji (`SIMULATION_ENABLED=false`) |
| Nagłówki HTTP | `frontend/nginx.conf` | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` (prod) |

## 4.5. WebSocket

`shift_ws.py` — weryfikacja roli ADMIN_MANAGER przed połączeniem z live-boardem.
