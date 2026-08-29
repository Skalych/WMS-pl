# 4. Bezpieczeństwo i role (RBAC)

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-29

## 4.1. Model autoryzacji

- **Tokeny JWT** — wydawane przy logowaniu (`routers/auth.py`, `routers/terminal.py`); payload: `sub`, `role`, `tv` (token_version).
- **Bearer token** — przekazywany w nagłówku `Authorization`.
- **SECRET_KEY** — wymagany z env (brak domyślnej wartości); generowanie: `openssl rand -hex 32` (`core/config.py`).
- **token_version** — kolumna `users.token_version`; walidacja w `deps.py` i `shift_ws.py`; inkrementacja przy `change_password()` unieważnia wszystkie tokeny.

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
| Rate limiting | `core/rate_limit.py` | In-memory limiter per IP (okno 60 s); `LOGIN_RATE_LIMIT=10` na `POST /auth/login` i `POST /terminal/login` → HTTP 429 |
| CORS | `main.py`, `config.py` | Allowlist `CORS_ORIGINS` (domyślnie localhost:3000/5173); w prod za nginx — pusta lista (same-origin) |
| Seed guard | `core/seed_guard.py` | Blokada seed gdy `APP_ENV=production` lub brak `ALLOW_SEED=1` |

## 4.5. WebSocket

`shift_ws.py` — weryfikacja roli `ADMIN_MANAGER` oraz zgodności `tv` z `user.token_version` przed połączeniem WebSocket.

**Uwaga:** rate limiter jest in-memory — [TODO: doprecyzować] zachowanie przy wielu workerach uvicorn (`--workers 2` w prod).
