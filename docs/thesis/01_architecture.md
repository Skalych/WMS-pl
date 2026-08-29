# 1. Архітектура системи WMS Nexus

> Автоматично підтримуваний розділ. Останнє оновлення: _[TODO]_

## 1.1. Призначення системи

WMS Nexus — система управління складом з хвильовим комплектуванням (wave batch picking), моніторингом працівників у реальному часі, обліком залишків та симуляцією складських операцій.

## 1.2. Технологічний стек

| Шар | Технології |
|-----|------------|
| Frontend | React 18, TypeScript, Vite, vanilla CSS |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic |
| База даних | PostgreSQL 16 |
| Авторизація | JWT + RBAC |
| Інфраструктура | Docker Compose, nginx (production frontend) |

## 1.3. Високорівнева архітектура

```
[Браузер / термінал] → [Frontend Vite] → [FastAPI REST + WebSocket]
                                              ↓
                                        [PostgreSQL]
```

## 1.4. Структура репозиторію

| Каталог | Призначення |
|---------|-------------|
| `backend/app/routers/` | HTTP та WebSocket маршрути |
| `backend/app/services/` | Бізнес-логіка |
| `backend/app/models/` | ORM-моделі SQLAlchemy |
| `backend/app/schemas/` | Pydantic-схеми запитів/відповідей |
| `backend/alembic/` | Міграції БД |
| `frontend/src/pages/` | Сторінки UI |
| `frontend/src/api/` | Клієнт API |

## 1.5. Архітектурні патерни

- **Router → Service → Model** — розділення HTTP-шару та бізнес-логіки.
- **Async SQLAlchemy** — неблокуючі запити до PostgreSQL.
- **WebSocket** — live-оновлення зміни (`shift_ws`).
- **Alembic** — версіонування схеми БД.

## 1.6. Взаємодія компонентів

_[TODO: додати діаграму потоків для inbound → inventory → waves → terminal]_
