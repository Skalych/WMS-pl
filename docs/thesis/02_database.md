# 2. Baza danych

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-29

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
| SortingStation, SortingBin | `models/sorting.py` | Sortowanie |
| WarehouseShift, ShiftReportDraft | `models/warehouse_shifts.py` | Zmiany magazynowe i raporty |
| AppSetting | `models/settings.py` | Ustawienia aplikacji |

## 2.3. Typy enum

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, ShiftEventType, LocationType, TransactionType, InboundStatus, OrderStatus (w tym `PARTIALLY_IN_WAVE`), OrderPriority, WaveStatus, TaskStatus, TaskType.

## 2.4. Relacje między encjami

- `Order` → `OrderItem` (1:N); `OrderItem.allocated_quantity` śledzi jednostki przypisane do fal.
- `Wave` → `WaveOrder` → `Order`; `MicroTask` → `MicroTaskItem` → opcjonalnie `OrderItem` (FK `order_item_id`).
- `InventoryBalance` — unikalność `(product_id, location_id, lot_number)`; `reserved_quantity` ≤ `quantity`.
- `WarehouseShift` → `ShiftReportDraft` (1:1, CASCADE).
- `User.token_version` — unieważnianie JWT po zmianie hasła.

_[TODO: diagram ER lub pełna tabela powiązań FK]_

## 2.5. Migracje

| Wersja | Plik | Zawartość |
|--------|------|-----------|
| initial | `a15babe6d3ee_initial_migration.py` | Schemat początkowy |
| f7a1b2c3d4e5 | `f7a1b2c3d4e5_add_warehouse_shifts.py` | Tabele `warehouse_shifts`, `shift_report_drafts` (JSONB metryk i treści raportu) |
| a3b4c5d6e7f8 | `a3b4c5d6e7f8_add_user_token_version.py` | Kolumna `users.token_version` |
| b1c2d3e4f5a6 | `b1c2d3e4f5a6_floor_ops_inventory_and_partial_waves.py` | Status `PARTIALLY_IN_WAVE`, `order_items.allocated_quantity`, FK `micro_task_items.order_item_id`, constrainty na `inventory_balances` |

Pozostałe migracje (m.in. `shift_events`, `app_settings`, `macro_orders`) — pliki w `backend/alembic/versions/`.
