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

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, LocationType, TransactionType, InboundStatus, OrderStatus (w tym `PARTIALLY_IN_WAVE` — od migracji `b1c2d3e4f5a6`), OrderPriority, WaveStatus, TaskStatus, TaskType.

## 2.4. Relacje między encjami

Kluczowe powiązania (FK):

| Relacja | Opis |
|---------|------|
| `Order` ↔ `Wave` (via `wave_orders`) | Jedno zamówienie może być w wielu falach (partial waves) |
| `MicroTaskItem.order_item_id` → `OrderItem` | Powiązanie pozycji picka z linią zamówienia |
| `WarehouseShift` → `ShiftReportDraft` (1:1, cascade delete) | Raport roboczy zmiany magazynowej |
| `WarehouseShift.started_by` / `ended_by` → `User` | Kto otworzył/zamknął okno zmiany magazynowej |

_[TODO: diagram ER]_

## 2.5. Migracje

Head: `b1c2d3e4f5a6`. Kluczowe migracje z ostatniego tygodnia:

| Revision | Plik | Zawartość |
|----------|------|-----------|
| `f7a1b2c3d4e5` | `add_warehouse_shifts.py` | Tabele `warehouse_shifts`, `shift_report_drafts` (JSONB `metrics_snapshot`, `content_json`) |
| `a3b4c5d6e7f8` | `add_user_token_version.py` | Kolumna `users.token_version` (int, domyślnie 0) |
| `b1c2d3e4f5a6` | `floor_ops_inventory_and_partial_waves.py` | Enum `PARTIALLY_IN_WAVE`; `order_items.allocated_quantity`; FK `micro_task_items.order_item_id`; CHECK constraints na `inventory_balances` (`quantity >= 0`, `reserved_quantity <= quantity`) |

Pozostałe migracje (starsze): `a15babe6d3ee` (initial), `68f8a3bfafdc` (efficiency), `40ea77881dee` (MacroOrder), `270832e39f09` (volume_cm3), `c92becbd3516` (cart_capacity), `bb58ae9ed22c` (ShiftEvent), `d4e8f1a2b3c4` (total_units_received), `e1f2a3b4c5d6` (app_settings).
