# 2. Baza danych

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-30

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
| Wave, WaveOrder, MicroTask, MicroTaskItem | `models/waves.py` | Fale kompletacji; `MicroTaskItem.order_item_id` łączy linię zadania z pozycją zamówienia |
| Container, IssuedContainerLabel | `models/containers.py` | Kontenery w trakcie kompletacji; etykiety wydane przez pakera (przed skanem pickera) |
| PickSession | `models/pick_sessions.py` | Sesja kompletacji pickera (krok `PickStep`, bieżąca linia) |
| SortingStation, SortingBin | `models/sorting.py` | Sortowanie |
| WarehouseShift, ShiftReportDraft | `models/warehouse_shifts.py` | Zmiany magazynowe i raporty |
| AppSetting | `models/settings.py` | Ustawienia aplikacji |

## 2.3. Typy enum

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, ShiftEventType, LocationType, TransactionType, InboundStatus, OrderStatus (w tym `PARTIALLY_IN_WAVE`), OrderPriority, WaveStatus, TaskStatus, TaskType, ContainerStatus, IssuedLabelStatus, PickStep.

## 2.4. Relacje między encjami

- **Zamówienia ↔ fale:** `WaveOrder` (M:N), `OrderItem.allocated_quantity` — częściowa alokacja do fali.
- **Fala → micro-task → pozycja:** `MicroTask.wave_id`, `MicroTaskItem.micro_task_id`, opcjonalnie `MicroTaskItem.order_item_id`.
- **Kompletacja:** `PickSession` → `User`, `MicroTask`, `Container`; `Container.micro_task_id`, `Container.picker_user_id`.
- **Etykiety kontenerów:** `IssuedContainerLabel` → `User` (wydający); po skanie pickera tworzony jest `Container`.
- **Stany magazynowe:** `InventoryBalance` z `reserved_quantity` (blokada przy tworzeniu fali); constrainty `ck_inventory_*` w migracji `b1c2d3e4f5a6`.

_[TODO: diagram ER]_

## 2.5. Migracje

| Wersja | Plik | Zawartość |
|--------|------|-----------|
| initial | `a15babe6d3ee_initial_migration.py` | Schemat początkowy |
| token_version | `a3b4c5d6e7f8_add_user_token_version.py` | Kolumna `users.token_version` (unieważnianie JWT) |
| partial waves | `b1c2d3e4f5a6_floor_ops_inventory_and_partial_waves.py` | `OrderStatus.PARTIALLY_IN_WAVE`, `order_items.allocated_quantity`, `micro_task_items.order_item_id`, constrainty rezerwacji stanów |
| picking terminal | `g8h9i0j1k2l3_picking_terminal_models.py` | Tabele `containers`, `pick_sessions`; `quantity_to_pick`/`quantity_picked` jako `Numeric(10,1)` |
| issued labels | `h9i0j1k2l3m4_issued_container_labels.py` | Tabela `issued_container_labels`; usunięcie pre-utworzonych kontenerów `AVAILABLE` |
