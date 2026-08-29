# 3. Moduły i logika biznesowa

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-29

## 3.1. Mapa modułów

| Moduł | Router | Service | Przeznaczenie |
|-------|--------|---------|---------------|
| Auth | `routers/auth.py` | — | Logowanie, JWT |
| Users | `routers/users.py` | `user_service.py` | Profile, pracownicy |
| Inventory | `routers/inventory.py` | `inventory_service.py` | Stany magazynowe, blokady |
| Inbound | `routers/inbound.py` | `inbound_service.py` | Przyjęcie towaru |
| Orders | `routers/orders.py` | `order_service.py` | Zamówienia |
| Waves | `routers/waves.py` | `wave_service.py` | Fale, micro-tasks |
| Terminal | `routers/terminal.py` | `terminal_service.py` | Terminal kompletacji |
| Dashboard | `routers/dashboard.py` | — | Analityka |
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py` | Zmiany magazynowe |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | — | `simulation_service.py` | Symulacja magazynu |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

**Serwis:** `wave_service.py`, **router:** `routers/waves.py`.

- Tworzenie fali (`POST /api/v1/waves`, rola `ADMIN_MANAGER`): zamówienia `PENDING` lub `PARTIALLY_IN_WAVE`; alokacja per linia (`need = requested_quantity - allocated_quantity`).
- **Partial waves:** status zamówienia `IN_WAVE` (pełna alokacja) lub `PARTIALLY_IN_WAVE` (częściowa); odpowiedź z `allocation_summary` (lines_fully/partially/skipped, total_units_allocated). Wyjątek `EmptyWaveError` → HTTP 400.
- Rezerwacja zapasów przez `inventory_service.find_best_balance()` + `reserve_stock()` z `SELECT … FOR UPDATE`.
- Lista/szczegóły fali zwracają `progress` (%), `micro_tasks[]` (status, progress, items_count, assigned_user_name), `micro_tasks_completed` / `micro_tasks_total`.
- **Frontend** (`Waves.tsx`): tabela z paskiem postępu; rozwijane wiersze z listą micro-tasków (polling co 5 s); sortowanie micro-tasków po statusie (`routers/waves.py`).

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

**Serwis:** `inventory_service.py`.

- `get_balance_at_location_for_update()` — blokada wiersza (`FOR UPDATE`).
- `reserve_stock()` — zwiększa `reserved_quantity`; dostępne = `quantity - reserved_quantity`.
- `commit_pick()` — zmniejsza `quantity` i `reserved_quantity`; transakcja typu `WAVE_PICK_BATCH`.
- `find_best_balance()` — wybór lokalizacji z największą dostępną ilością (DESC).
- Wyjątki: `InsufficientStockError`, `InsufficientReservedError`, `BalanceNotFoundError` → HTTP 409 w terminalu.

### 3.2.3. Terminal kompletacji i FIFO claim

**Serwis:** `terminal_service.py`, **router:** `routers/terminal.py`.

- `get_next_task()`: najpierw zadanie `IN_PROGRESS` użytkownika; potem `PENDING` bez `assigned_user_id`, sortowanie `Wave.created_at ASC`, `MicroTask.created_at ASC`.
- Claim: `with_for_update(of=MicroTask, skip_locked=True)` — bezpieczne przejęcie w wielowątkowości.
- Po claim: status `IN_PROGRESS`, `assigned_user_id`, `user.status = PICKING`.
- Skan (`POST /tasks/{task_id}/scan`): `commit_pick` + broadcast `shift_live`.

### 3.2.4. Zmiany magazynowe i raporty

**Serwisy:** `warehouse_shift_service.py`, `shift_metrics_service.py`, `report_export_service.py`.

- `ensure_open_warehouse_shift()` / `maybe_close_warehouse_shift()` — okno magazynowe otwiera się przy starcie zmiany pracowników, zamyka gdy brak aktywnych.
- `floor_status_for_role()` (`user_service.py`): `INBOUND_OPERATOR` → `RECEIVING`, `PACKER_DISPATCHER` → `SORTING`, pozostali → `IDLE`; używane przy starcie zmiany, końcu przerwy, bulk update.
- `POST /api/v1/users/shift/end-all` — masowe zakończenie zmian wszystkich pracowników (`end_all_shifts()`).
- Raporty: draft JSON (`ShiftReportDraft`), metryki (`items_picked`, `hourly_buckets`, `top_pickers`), eksport PDF/DOCX/HTML (WeasyPrint + fallback ReportLab).
- **Frontend:** `ShiftReportsPage.tsx`, `ShiftReportEditorPage.tsx`; usunięto fullscreen board (`ShiftBoardPage.tsx`, commit `efd1272`).

### 3.2.5. Przyjęcia (Inbound)

_[TODO: doprecyzować szczegóły logiki receive]_

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/api/v1/auth/login` | public | Logowanie panelu (rate limit) |
| POST | `/api/v1/terminal/login` | public | Logowanie terminala (rate limit) |
| GET | `/api/v1/waves` | authenticated | Lista fal z progress i micro-tasks |
| POST | `/api/v1/waves` | ADMIN_MANAGER | Tworzenie fali + allocation_summary |
| GET | `/api/v1/terminal/tasks/next` | PICKER, … | FIFO claim następnego zadania |
| POST | `/api/v1/users/shift/end-all` | ADMIN_MANAGER | Zakończenie wszystkich zmian |
| GET | `/api/v1/warehouse-shifts` | ADMIN_MANAGER | Lista okien magazynowych |
| GET/PUT | `/api/v1/warehouse-shifts/{id}/report` | ADMIN_MANAGER | Draft raportu zmiany |
| POST | `/api/v1/warehouse-shifts/{id}/report/export` | ADMIN_MANAGER | Eksport PDF/DOCX/HTML |
| GET | `/api/v1/dashboard/shift-live` | ADMIN_MANAGER | Snapshot metryk (REST fallback) |
| WS | `/api/v1/ws/shift-live?token=` | ADMIN_MANAGER | Live monitoring |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
