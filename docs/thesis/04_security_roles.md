# 4. Безпека та ролі (RBAC)

> Автоматично підтримуваний розділ. Останнє оновлення: _[TODO]_

## 4.1. Модель авторизації

- **JWT-токени** — видаються при логіні (`routers/auth.py`).
- **Bearer token** — передається в заголовку `Authorization`.
- **token_version** — інвалідація сесій при зміні пароля/ролі.

## 4.2. Ролі користувачів (UserRole)

| Роль | Enum | Типовий доступ |
|------|------|----------------|
| Admin Manager | `ADMIN_MANAGER` | Повний доступ, адмін-панель |
| Picker | `PICKER` | Термінал комплектування |
| Inbound Operator | `INBOUND_OPERATOR` | Приймання, inventory |
| Packer / Dispatcher | `PACKER_DISPATCHER` | Упаковка, dispatch |

Див. `backend/app/models/enums.py` та `backend/app/core/deps.py` (`require_roles`).

## 4.3. Перевірка прав

- `get_current_user` — автентифікація за JWT.
- `require_roles(...)` — обмеження ендпоінтів за ролями.
- Приклад: `terminal.py` — доступ для PICKER, PACKER_DISPATCHER, ADMIN_MANAGER.

## 4.4. Додаткові заходи

| Механізм | Файл | Опис |
|----------|------|------|
| Rate limiting | `core/rate_limit.py` | Обмеження частоти запитів |
| CORS | `main.py` | Політика cross-origin |
| Seed guard | `core/seed_guard.py` | Захист demo-seed у production |

## 4.5. WebSocket

`shift_ws.py` — перевірка ролі ADMIN_MANAGER для підключення до live-борду.
