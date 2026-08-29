# 3. Модулі та бізнес-логіка

> Автоматично підтримуваний розділ. Останнє оновлення: _[TODO]_

## 3.1. Карта модулів

| Модуль | Router | Service | Призначення |
|--------|--------|---------|-------------|
| Auth | `routers/auth.py` | — | Логін, JWT |
| Users | `routers/users.py` | `user_service.py` | Профілі, працівники |
| Inventory | `routers/inventory.py` | `inventory_service.py` | Залишки, блокування |
| Inbound | `routers/inbound.py` | `inbound_service.py` | Приймання товару |
| Orders | `routers/orders.py` | `order_service.py` | Замовлення |
| Waves | `routers/waves.py` | `wave_service.py` | Хвилі, micro-tasks |
| Terminal | `routers/terminal.py` | `terminal_service.py` | Термінал комплектування |
| Dashboard | `routers/dashboard.py` | — | Аналітика |
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py` | Складські зміни |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | WebSocket моніторинг |
| Simulation | — | `simulation_service.py` | Симуляція складу |

## 3.2. Ключова бізнес-логіка

### 3.2.1. Хвилі комплектування (Waves)

_[TODO: описати створення хвилі, partial waves, FIFO claim]_

### 3.2.2. Облік залишків (Inventory)

_[TODO: блокування, транзакції, FIFO]_

### 3.2.3. Приймання (Inbound)

_[TODO]_

### 3.2.4. Складські зміни та звіти

_[TODO: shift events, break, floor status]_

## 3.3. API ендпоінти (огляд)

_[TODO: таблиця метод + шлях + роль + короткий опис]_

Повний список — OpenAPI за адресою `/docs` (Swagger UI) після запуску backend.
