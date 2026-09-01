# 4. Bezpieczeństwo i role (RBAC)

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-09-01

## 4.1. Model autoryzacji

- **Tokeny JWT** — wydawane przy logowaniu (`routers/auth.py`).
- **Bearer token** — przekazywany w nagłówku `Authorization`.
- **token_version** — unieważnianie sesji przy zmianie hasła/roli.

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
- `terminal.py` — `TERMINAL_ACCESS`: PICKER, PACKER_DISPATCHER, ADMIN_MANAGER.
- `packer.py` — `PACKER_ACCESS`: PACKER_DISPATCHER, ADMIN_MANAGER.
- `POST /users/shift/end-all` — wyłącznie ADMIN_MANAGER.

## 4.4. Dodatkowe mechanizmy

| Mechanizm | Plik | Opis |
|-----------|------|------|
| Rate limiting | `core/rate_limit.py` | Ograniczenie częstotliwości żądań |
| CORS | `main.py` | Polityka cross-origin |
| Seed guard | `core/seed_guard.py` | Ochrona demo-seed w produkcji |

## 4.5. WebSocket

`shift_ws.py` — weryfikacja roli ADMIN_MANAGER przed połączeniem z live-boardem.
