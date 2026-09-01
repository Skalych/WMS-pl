# 2. Baza danych

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-09-01

## 2.1. SGBD i ORM

- **PostgreSQL 16** — główne magazyn danych.
- **SQLAlchemy 2.0 (async)** — ORM w `backend/app/models/`.
- **Alembic** — migracje w `backend/alembic/versions/`.

## 2.2. Główne encje

| Model | Plik | Opis |
|-------|------|------|
| User, Shift | `models/users.py` | Użytkownicy i zmiany pracowników |
| Zone, Location | `models/topology.py` | Topologia magazynu |
| Category, Product | `models/catalog.py` | Katalog produktów |
| InventoryBalance, InventoryTransaction | `models/inventory.py` | Stany magazynowe i ruch |
| InboundShipment, InboundItem | `models/inbound.py` | Przyjęcia towaru |
| Order, OrderItem | `models/orders.py` | Zamówienia |
| Wave, WaveOrder, MicroTask, MicroTaskItem | `models/waves.py` | Fale kompletacji |
| Container, IssuedContainerLabel | `models/containers.py` | Kontenery i wydane etykiety |
| PickSession | `models/pick_sessions.py` | Sesja kompletacji na terminalu |
| SortingStation, SortingBin | `models/sorting.py` | Sortowanie |
| WarehouseShift, ShiftReportDraft | `models/warehouse_shifts.py` | Zmiany magazynowe i raporty |
| AppSetting | `models/settings.py` | Ustawienia aplikacji |

## 2.3. Typy enum

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, LocationType, TransactionType, InboundStatus, OrderStatus (w tym `PARTIALLY_IN_WAVE`), OrderPriority, WaveStatus, TaskStatus, TaskType, ContainerStatus, IssuedLabelStatus, PickStep, ShiftEventType.

## 2.4. Relacje między encjami

- `Order` 1—N `OrderItem` — pozycja ma `allocated_quantity` (alokacja do fal).
- `Wave` 1—N `MicroTask` 1—N `MicroTaskItem` — pozycja może wskazywać `order_item_id` (FK).
- `MicroTask` N—1 `User` (`assigned_user_id`) — przypisanie pickera po `claim_task`.
- `PickSession` N—1 `User`, N—1 `MicroTask`, opcjonalnie N—1 `Container`, N—1 `MicroTaskItem` (`current_item_id`).
- `Container` — powiązany z `micro_task_id`, `picker_user_id`, `buffer_code`; status `IN_PICKING` → `AT_BUFFER` → `CLOSED`.
- `IssuedContainerLabel` — etykieta wydana przez packera; po skanie pickera tworzy rekord `Container`.
- `InventoryBalance` — `quantity`, `reserved_quantity` z ograniczeniami CHECK (≥ 0, reserved ≤ quantity).

_[TODO: doprecyzować diagram ER]_

## 2.5. Migracje

| Wersja | Plik | Zawartość |
|--------|------|-----------|
| initial | `a15babe6d3ee_initial_migration.py` | Schemat początkowy |
| b1c2d3e4f5a6 | `b1c2d3e4f5a6_floor_ops_inventory_and_partial_waves.py` | `PARTIALLY_IN_WAVE`, `allocated_quantity`, FK `micro_task_items.order_item_id`, CHECK na `inventory_balances` |
| g8h9i0j1k2l3 | `g8h9i0j1k2l3_picking_terminal_models.py` | Tabele `containers`, `pick_sessions`; enumy `ContainerStatus`, `PickStep`; `quantity_*` jako `Numeric(10,1)`; `SHIFT_CLOCK_IN/OUT` |
| h9i0j1k2l3m4 | `h9i0j1k2l3m4_issued_container_labels.py` | Tabela `issued_container_labels`; usunięcie pre-seedowanych kontenerów `AVAILABLE` |
| _[TODO]_ | _pozostałe pliki w `alembic/versions/`_ | _opisać starsze migracje przy potrzebie_ |
