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
| Container, IssuedContainerLabel | `models/containers.py` | Kontenery kompletacji i wydane etykiety (przed skanem) |
| PickSession | `models/pick_sessions.py` | Sesja pickera na terminalu (krok, bieżąca pozycja) |

## 2.3. Typy enum

Zob. `backend/app/models/enums.py`: UserRole, WorkerStatus, LocationType, TransactionType, InboundStatus, OrderStatus (w tym `PARTIALLY_IN_WAVE`), OrderPriority, WaveStatus, TaskStatus, TaskType, ContainerStatus, IssuedLabelStatus, PickStep, ShiftEventType.

## 2.4. Relacje między encjami

| Od | Do | Opis |
|----|-----|------|
| `PickSession` | `User`, `MicroTask`, `Container`, `MicroTaskItem` | Sesja terminala powiązana z pickerem i bieżącą linią |
| `Container` | `MicroTask`, `User` (picker) | Kontener aktywowany po skanie etykiety |
| `IssuedContainerLabel` | `User` (issued_by) | Etykieta wydana przez packera; `CONSUMED` po skanie |
| `MicroTaskItem` | `OrderItem` | Powiązanie linii zadania z pozycją zamówienia (partial waves) |
| `OrderItem` | — | Pole `allocated_quantity` — ile jednostek trafiło do fal |
| `InventoryBalance` | — | `reserved_quantity` ≤ `quantity` (check constraints) |
| `WarehouseShift` | `ShiftReportDraft` | Raport zmiany magazynowej (JSONB) |
| `User` | — | `token_version` — unieważnianie JWT |

_[TODO: diagram ER]_.

## 2.5. Migracje

| Wersja | Plik | Zawartość |
|--------|------|-----------|
| initial | `a15babe6d3ee_initial_migration.py` | Schemat początkowy |
| f7a1b2c3d4e5 | `add_warehouse_shifts.py` | `warehouse_shifts`, `shift_report_drafts` |
| a3b4c5d6e7f8 | `add_user_token_version.py` | Kolumna `users.token_version` |
| b1c2d3e4f5a6 | `floor_ops_inventory_and_partial_waves.py` | `PARTIALLY_IN_WAVE`, `allocated_quantity`, `order_item_id` na micro-task, constrainty inventory |
| g8h9i0j1k2l3 | `picking_terminal_models.py` | `containers`, `pick_sessions`, enum `PickStep`, `quantity_to_pick/picked` → Numeric |
| h9i0j1k2l3m4 | `issued_container_labels.py` | `issued_container_labels`, usunięcie statusu `AVAILABLE` z kontenerów |
