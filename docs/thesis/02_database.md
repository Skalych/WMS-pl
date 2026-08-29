# 2. База даних

> Автоматично підтримуваний розділ. Останнє оновлення: _[TODO]_

## 2.1. СУБД та ORM

- **PostgreSQL 16** — основне сховище.
- **SQLAlchemy 2.0 (async)** — ORM у `backend/app/models/`.
- **Alembic** — міграції у `backend/alembic/versions/`.

## 2.2. Основні сутності

| Модель | Файл | Опис |
|--------|------|------|
| User, Shift | `models/users.py` | Користувачі та зміни працівників |
| Zone, Location | `models/topology.py` | Топологія складу |
| Category, Product | `models/catalog.py` | Каталог товарів |
| InventoryBalance, InventoryTransaction | `models/inventory.py` | Залишки та рух |
| InboundShipment, InboundItem | `models/inbound.py` | Приймання |
| Order, OrderItem | `models/orders.py` | Замовлення |
| Wave, WaveOrder, MicroTask, MicroTaskItem | `models/waves.py` | Хвилі комплектування |
| SortingStation, SortingBin | `models/sorting.py` | Сортування |
| WarehouseShift, ShiftReportDraft | `models/warehouse_shifts.py` | Складські зміни та звіти |
| AppSetting | `models/settings.py` | Налаштування додатку |

## 2.3. Перелік enum-типів

Див. `backend/app/models/enums.py`: UserRole, WorkerStatus, LocationType, TransactionType, InboundStatus, OrderStatus, OrderPriority, WaveStatus, TaskStatus, TaskType.

## 2.4. Зв'язки між сутностями

_[TODO: ER-діаграма або таблиця FK-зв'язків]_

## 2.5. Міграції

| Версія | Файл | Зміст |
|--------|------|-------|
| initial | `a15babe6d3ee_initial_migration.py` | Початкова схема |
| _[TODO]_ | _інші файли в `alembic/versions/`_ | _описати ключові зміни_ |
