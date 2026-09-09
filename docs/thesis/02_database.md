# 2. Baza danych

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-09-01_

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
| Container, IssuedContainerLabel | `models/containers.py` | Kontenery w kompletacji i wydane etykiety |
| PickSession | `models/pick_sessions.py` | Sesja kompletacji pickera (krok, kontener, pozycja) |

## 2.3. Typy enum

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, ShiftEventType, ContainerStatus, IssuedLabelStatus, PickStep, LocationType, TransactionType, InboundStatus, OrderStatus (w tym `PARTIALLY_IN_WAVE`), OrderPriority, WaveStatus, TaskStatus, TaskType.

## 2.4. Relacje między encjami

| Od | Do | Opis |
|----|-----|------|
| `OrderItem` | `MicroTaskItem` | `order_item_id` — śledzenie alokacji częściowej w fali |
| `MicroTask` | `Container` | Kontener przypisany do zadania kompletacji |
| `MicroTask` | `PickSession` | Aktywna sesja pickera na zadaniu |
| `User` | `IssuedContainerLabel` | Etykieta wydana przez packera (`issued_by_user_id`) |
| `InventoryBalance` | — | `reserved_quantity` ≤ `quantity` (CHECK constraints) |

_[TODO: doprecyzować diagram ER dla sortowania i macro_orders]_

## 2.5. Migracje

| Wersja | Plik | Zawartość |
|--------|------|-----------|
| initial | `a15babe6d3ee_initial_migration.py` | Schemat początkowy |
| b1c2d3e4f5a6 | `b1c2d3e4f5a6_floor_ops_inventory_and_partial_waves.py` | `PARTIALLY_IN_WAVE`, `order_items.allocated_quantity`, FK `micro_task_items.order_item_id`, CHECK na `inventory_balances` |
| g8h9i0j1k2l3 | `g8h9i0j1k2l3_picking_terminal_models.py` | Tabele `containers`, `pick_sessions`; `quantity_to_pick` / `quantity_picked` → `Numeric(10,1)` |
| h9i0j1k2l3m4 | `h9i0j1k2l3m4_issued_container_labels.py` | Tabela `issued_container_labels`; usunięcie kontenerów ze statusem `AVAILABLE` |
