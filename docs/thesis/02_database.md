# 2. Baza danych

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-31

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
| Container, IssuedContainerLabel | `models/containers.py` | Kontenery i wydrukowane etykiety |
| PickSession | `models/pick_sessions.py` | Sesja kompletacji w terminalu (krok `PickStep`) |
| SortingStation, SortingBin | `models/sorting.py` | Sortowanie |
| WarehouseShift, ShiftReportDraft | `models/warehouse_shifts.py` | Zmiany magazynowe i raporty |
| AppSetting | `models/settings.py` | Ustawienia aplikacji |

## 2.3. Typy enum

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, ShiftEventType, ContainerStatus, IssuedLabelStatus, PickStep, LocationType, TransactionType, InboundStatus, OrderStatus (`PARTIALLY_IN_WAVE`), OrderPriority, WaveStatus (`CANCELLED`), TaskStatus, TaskType.

## 2.4. Relacje między encjami

| Encja | Kluczowe FK / powiązania |
|-------|--------------------------|
| `OrderItem` | `allocated_quantity` — częściowa alokacja do fal (`order_items`) |
| `MicroTaskItem` | `order_item_id` → `OrderItem`; `source_location_id`, `product_id` |
| `InventoryBalance` | `product_id` + `location_id` + `lot_number`; `reserved_quantity` ≤ `quantity` |
| `PickSession` | `user_id`, `micro_task_id`, opcjonalnie `container_id`, `current_item_id` |
| `Container` | `micro_task_id`, `picker_user_id`; status `IN_PICKING` / `AT_BUFFER` / `CLOSED` |
| `IssuedContainerLabel` | `issued_by_user_id`; status `ISSUED` → `CONSUMED` po skanie pickera |
| `User` | `token_version` — unieważnianie JWT |

_[TODO: diagram ER w narzędziu CASE]_

## 2.5. Migracje

| Rewizja | Plik | Zawartość |
|---------|------|-----------|
| `a15babe6d3ee` | `a15babe6d3ee_initial_migration.py` | Schemat początkowy |
| `a3b4c5d6e7f8` | `a3b4c5d6e7f8_add_user_token_version.py` | Kolumna `users.token_version` |
| `b1c2d3e4f5a6` | `b1c2d3e4f5a6_floor_ops_inventory_and_partial_waves.py` | `PARTIALLY_IN_WAVE`, `allocated_quantity`, `order_item_id` w micro-taskach, constrainty rezerwacji stanów |
| `g8h9i0j1k2l3` | `g8h9i0j1k2l3_picking_terminal_models.py` | Tabele `containers`, `pick_sessions`; enum `PickStep`; `quantity_*` jako `Numeric(10,1)` |
| `h9i0j1k2l3m4` | `h9i0j1k2l3m4_issued_container_labels.py` | Tabela `issued_container_labels`; usunięcie statusu `AVAILABLE` z kontenerów |
