# 2. Baza danych

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-08-30_

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
| Container, IssuedContainerLabel | `models/containers.py` | Kontenery w trakcie pickingu i wydane etykiety |
| PickSession | `models/pick_sessions.py` | Sesja terminala kompletacji (krok, bieżąca linia) |
| SortingStation, SortingBin | `models/sorting.py` | Sortowanie |
| WarehouseShift, ShiftReportDraft | `models/warehouse_shifts.py` | Zmiany magazynowe i raporty |
| AppSetting | `models/settings.py` | Ustawienia aplikacji |

## 2.3. Typy enum

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, ShiftEventType, ContainerStatus, IssuedLabelStatus, PickStep, LocationType, TransactionType, InboundStatus, OrderStatus (`PARTIALLY_IN_WAVE`), OrderPriority, WaveStatus (`CANCELLED`), TaskStatus, TaskType.

## 2.4. Relacje między encjami

Kluczowe powiązania (poza standardowymi FK katalogu i inbound):

| Encja | Relacja | Cel |
|-------|---------|-----|
| `MicroTaskItem` | `order_item_id` | `OrderItem` — śledzenie alokacji w partial wave |
| `OrderItem` | `allocated_quantity` | Ilość już przypisana do fal |
| `PickSession` | `user_id`, `micro_task_id`, `container_id`, `current_item_id` | User, MicroTask, Container, MicroTaskItem |
| `Container` | `micro_task_id`, `picker_user_id` | Zadanie i picker po aktywacji skanem |
| `IssuedContainerLabel` | `issued_by_user_id` | Packer, który wygenerował kod |

`inventory_balances`: ograniczenia CHECK — `quantity ≥ 0`, `reserved_quantity ≥ 0`, `reserved_quantity ≤ quantity` (migracja `b1c2d3e4f5a6`).

_[TODO: diagram ER dla pełnego schematu]_

## 2.5. Migracje

| Wersja | Plik | Zawartość |
|--------|------|-----------|
| initial | `a15babe6d3ee_initial_migration.py` | Schemat początkowy |
| a3b4c5d6e7f8 | `a3b4c5d6e7f8_add_user_token_version.py` | Kolumna `users.token_version` |
| b1c2d3e4f5a6 | `b1c2d3e4f5a6_floor_ops_inventory_and_partial_waves.py` | `PARTIALLY_IN_WAVE`, `allocated_quantity`, `order_item_id` na micro-task, CHECK na inventory |
| g8h9i0j1k2l3 | `g8h9i0j1k2l3_picking_terminal_models.py` | Tabele `containers`, `pick_sessions`; `quantity_*` na `micro_task_items` → Numeric(10,1) |
| h9i0j1k2l3m4 | `h9i0j1k2l3m4_issued_container_labels.py` | Tabela `issued_container_labels`; usunięcie pre-created `AVAILABLE` containers |
