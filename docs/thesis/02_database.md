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
| MacroOrder, Order, OrderItem | `models/orders.py` | Zamówienia (makro i pozycje; `allocated_quantity` na pozycji) |
| Wave, WaveOrder, MicroTask, MicroTaskItem | `models/waves.py` | Fale kompletacji |
| SortingStation, SortingBin | `models/sorting.py` | Sortowanie |
| WarehouseShift, ShiftReportDraft | `models/warehouse_shifts.py` | Zmiany magazynowe i raporty |
| AppSetting | `models/settings.py` | Ustawienia aplikacji |

## 2.3. Typy enum

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, ShiftEventType, LocationType, TransactionType, InboundStatus, OrderStatus (w tym `PARTIALLY_IN_WAVE`), OrderPriority, WaveStatus, TaskStatus, TaskType.

## 2.4. Relacje między encjami

| Od | Do | Typ | Uwagi |
|----|----|-----|-------|
| MacroOrder | Order | 1:N | `orders.macro_order_id` |
| Order | OrderItem | 1:N | `allocated_quantity` ≤ `requested_quantity` |
| Order | WaveOrder | N:M | przez `wave_orders` |
| Wave | MicroTask | 1:N | zadania kompletacji |
| MicroTask | MicroTaskItem | 1:N | `order_item_id` → `order_items` (częściowe fale) |
| MicroTaskItem | OrderItem | N:1 | opcjonalne powiązanie pozycji zamówienia |
| InventoryBalance | Product, Location | N:1 | `reserved_quantity` ≤ `quantity` (CHECK) |
| WarehouseShift | ShiftReportDraft | 1:1 | raport zmiany magazynowej |
| User | Shift | 1:N | `shift_events` rejestrują LOGIN/LOGOUT/przerwy |

_[TODO: doprecyzować diagram ER dla topologii magazynu i sortowania]_

## 2.5. Migracje

| Wersja | Plik | Zawartość |
|--------|------|-----------|
| initial | `a15babe6d3ee_initial_migration.py` | Schemat początkowy |
| e1f2a3b4c5d6 | `e1f2a3b4c5d6_add_app_settings.py` | Tabela `app_settings` (klucz-wartość, m.in. `simulation_active`) |
| f7a1b2c3d4e5 | `f7a1b2c3d4e5_add_warehouse_shifts.py` | `warehouse_shifts`, `shift_report_drafts` (JSONB) |
| a3b4c5d6e7f8 | `a3b4c5d6e7f8_add_user_token_version.py` | Kolumna `users.token_version` (unieważnianie JWT) |
| b1c2d3e4f5a6 | `b1c2d3e4f5a6_floor_ops_inventory_and_partial_waves.py` | `PARTIALLY_IN_WAVE`, `order_items.allocated_quantity`, `micro_task_items.order_item_id`, constrainty na `inventory_balances` |
