# 2. Baza danych

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: **2026-08-29**

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

| Encja A | Encja B | Typ | Opis |
|---------|---------|-----|------|
| Order | OrderItem | 1:N | Pozycje zamówienia; `allocated_quantity` śledzi alokację do fali |
| Order | WaveOrder | N:M | Zamówienie w wielu falach (przez `wave_orders`) |
| Wave | MicroTask | 1:N | Zadania kompletacji w ramach fali |
| MicroTaskItem | OrderItem | N:1 | Powiązanie pozycji zadania z linią zamówienia (`order_item_id`) |
| InventoryBalance | Product, Location | N:1 | Stan magazynowy; `reserved_quantity` ≤ `quantity` (CHECK) |
| WarehouseShift | ShiftReportDraft | 1:1 | Raport zmiany magazynowej (JSON w `content_json`) |
| User | Shift | 1:N | Zmiany pracownika; `ShiftEvent` rejestruje przerwy |

## 2.5. Migracje

| Rewizja | Plik | Zawartość |
|---------|------|-----------|
| `a15babe6d3ee` | `initial_migration.py` | Schemat początkowy |
| `e1f2a3b4c5d6` | `add_app_settings.py` | Tabela `app_settings` (klucz `simulation_active`) |
| `f7a1b2c3d4e5` | `add_warehouse_shifts.py` | `warehouse_shifts`, `shift_report_drafts` (JSONB) |
| `a3b4c5d6e7f8` | `add_user_token_version.py` | Kolumna `users.token_version` (unieważnianie JWT) |
| `b1c2d3e4f5a6` | `floor_ops_inventory_and_partial_waves.py` | `PARTIALLY_IN_WAVE`, `order_items.allocated_quantity`, `micro_task_items.order_item_id`, constrainty rezerwacji stanów |

Łańcuch migracji: `a15babe6d3ee` → … → `b1c2d3e4f5a6` (head).
