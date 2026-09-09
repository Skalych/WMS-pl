# 4. Bezpieczeństwo i role (RBAC)

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-30

## 4.1. Model autoryzacji

- **Tokeny JWT** — wydawane przy logowaniu (`routers/auth.py`, `terminal_service.terminal_login`).
- **Bearer token** — przekazywany w nagłówku `Authorization`.
- **token_version (`tv` w payload)** — pole w JWT; przy zmianie hasła lub roli (`user_service`) wersja jest inkrementowana, co unieważnia wcześniejsze tokeny (`deps.get_current_user`, `shift_ws`).
- **SECRET_KEY** — wymagany z zmiennej środowiskowej (brak domyślnej wartości); używany do podpisu JWT (`core/security.py`, `core/config.py`).

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
- Przykład: `packer.py` — dostęp dla PACKER_DISPATCHER, ADMIN_MANAGER.

## 4.4. Dodatkowe mechanizmy

| Mechanizm | Plik | Opis |
|-----------|------|------|
| Rate limiting logowania | `core/rate_limit.py` | Limit żądań na IP (`LOGIN_RATE_LIMIT`, domyślnie 10/min); `/auth/login` i `/terminal/login` |
| CORS allowlist | `main.py`, `core/config.py` | `CORS_ORIGINS` — lista dozwolonych originów (JSON w env); w prod domyślnie `[]` |
| Seed guard | `core/seed_guard.py` | Blokada seed w `APP_ENV=production` oraz bez `ALLOW_SEED=1` |
| Nagłówki bezpieczeństwa | `frontend/nginx.conf` | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` |
| Symulacja w prod | `core/config.py` | `SIMULATION_DEFAULT_ACTIVE` — wyłączona, gdy `APP_ENV=production` (chyba że wymuszono) |

## 4.5. WebSocket

`shift_ws.py` — weryfikacja roli ADMIN_MANAGER oraz zgodności `token_version` przed połączeniem z live-boardem.
