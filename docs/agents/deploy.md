# Deploy checklist (agent reminder)

Використовуй цей чекліст перед/після деплою WMS Nexus у **production** або **staging**.

## Обов'язкові env-змінні (backend)

| Variable | Production value | Чому |
|----------|------------------|------|
| `SECRET_KEY` | **required** — згенеруй новий (`openssl rand -hex 32`) | JWT-підпис; без дефолту, app не стартує |
| `APP_ENV` | `production` | Блокує `seed` (drop_all) |
| `ALLOW_SEED` | **не задавати** або `false` | Seed знищує всі таблиці |
| `CORS_ORIGINS` | JSON-масив доменів фронта, напр. `["https://app.example.com"]` | Без `"*"`; localhost у prod не потрібен |
| `POSTGRES_*` | creds production БД | — |

Опційно:

| Variable | Default | Коли міняти |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | `false` лише для дебагу |
| `LOGIN_RATE_LIMIT` | `10` | спроб/хв на IP для login |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24 год) | якщо потрібен коротший термін |

Frontend (prod build):

| Variable | Приклад |
|----------|---------|
| `VITE_API_URL` | `https://api.example.com/api/v1` |

## Команди після деплою коду

```bash
cd backend
alembic upgrade head    # обов'язково після змін у models/migrations
# перезапустити uvicorn / контейнер backend
```

Локально міграція `a3b4c5d6e7f8` додає `users.token_version` (JWT revocation).

## Що очікувати після деплою

1. **Перелогін** — старі JWT без claim `tv` або зі старим `token_version` → 401.
2. **Seed на prod — НІКОЛИ** — навіть з `ALLOW_SEED=1` заблоковано при `APP_ENV=production`.
3. **Rate-limit** — >10 login/хв з одного IP → HTTP 429.
4. **Зміна пароля** (`change_password`) інвалідує всі активні токени користувача.

## Smoke test

```bash
curl -sf https://api.example.com/health

curl -i -X OPTIONS https://api.example.com/api/v1/auth/login \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: POST"
# у відповіді НЕ має бути access-control-allow-origin: https://evil.example

curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'
```

## Не комітити

- `backend/.env` (секрети)
- `.cursor/debug-*.log`
- локальні скрипти `backend/test_*.py` (ручні чернетки)

## Посилання

- Повний список env: `README.md` → Environment Variables
- Приклад `.env`: `backend/.env.example`
