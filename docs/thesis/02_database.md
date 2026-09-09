# 2. Baza danych

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-08-29_

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
| Wave, WaveOrder, MicroTask, MicroTaskItem | `models/waves.py` | Fale kompletacji; `MicroTaskItem.order_item_id` (FK), ilości `Numeric(10,1)` |
| PickSession | `models/pick_sessions.py` | Sesja kompletacji na terminalu (krok `PickStep`, FK do micro_task, container) |
| Container, IssuedContainerLabel | `models/containers.py` | Kontenery fizyczne i wydane etykiety (przed skanem pickera) |
| SortingStation, SortingBin | `models/sorting.py` | Sortowanie |
| WarehouseShift, ShiftReportDraft | `models/warehouse_shifts.py` | Zmiany magazynowe i raporty |
| AppSetting | `models/settings.py` | Ustawienia aplikacji |

## 2.3. Typy enum

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, ShiftEventType, ContainerStatus, IssuedLabelStatus, PickStep, LocationType, TransactionType, InboundStatus, OrderStatus (w tym `PARTIALLY_IN_WAVE`), OrderPriority, WaveStatus, TaskStatus, TaskType.

## 2.4. Relacje między encjami

Kluczowe powiązania FK (wybrane):

| Od | Do | Uwagi |
|----|-----|-------|
| `pick_sessions` | `users`, `micro_tasks`, `containers`, `micro_task_items` | Jedna aktywna sesja na pickera |
| `containers` | `micro_tasks`, `users` (picker, creator) | Status `IN_PICKING` → `AT_BUFFER` → `CLOSED` |
| `issued_container_labels` | `users` (issued_by) | Etykieta `ISSUED` → `CONSUMED` po skanie |
| `micro_task_items` | `order_items` | Alokacja częściowa w falach |
| `warehouse_shifts` | `shift_report_drafts` | 1:1 raport draft |
| `inventory_balances` | `products`, `locations` | `reserved_quantity` ≤ `quantity` (CHECK) |

_[TODO: diagram ER]_

## 2.5. Migracje

| Wersja | Plik | Zawartość |
|--------|------|-----------|
| initial | `a15babe6d3ee_initial_migration.py` | Schemat początkowy |
| f7a1b2c3d4e5 | `f7a1b2c3d4e5_add_warehouse_shifts.py` | `warehouse_shifts`, `shift_report_drafts` |
| a3b4c5d6e7f8 | `a3b4c5d6e7f8_add_user_token_version.py` | Kolumna `users.token_version` |
| b1c2d3e4f5a6 | `b1c2d3e4f5a6_floor_ops_inventory_and_partial_waves.py` | `PARTIALLY_IN_WAVE`, `allocated_quantity`, FK `micro_task_items.order_item_id`, CHECK na rezerwacjach |
| g8h9i0j1k2l3 | `g8h9i0j1k2l3_picking_terminal_models.py` | `containers`, `pick_sessions`, `PickStep`, `Numeric` na ilościach micro-task |
| h9i0j1k2l3m4 | `h9i0j1k2l3m4_issued_container_labels.py` | `issued_container_labels`, usunięcie kontenerów `AVAILABLE` |
