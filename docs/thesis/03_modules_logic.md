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

Logika w `wave_service.py`:

- **Tworzenie fali** (`POST /waves`) — dla zamówień w statusie `PENDING` lub `PARTIALLY_IN_WAVE`; alokacja stanów przez `inventory_service.reserve_stock`.
- **Częściowe fale** — gdy brak pełnego stanu, pozycja dostaje `allocated_quantity` < `requested_quantity`, zamówienie przechodzi w `PARTIALLY_IN_WAVE`; pełna alokacja → `IN_WAVE`. `MicroTaskItem.order_item_id` wiąże zadanie z konkretną pozycją.
- **Podział na micro-tasks** — limit objętości (`MAX_VOLUME_PER_TASK`); wiele zadań na jedną falę.
- **FIFO claim** (`terminal_service.get_next_task`) — kolejność `Wave.created_at`, potem `MicroTask.created_at`; `SELECT … FOR UPDATE SKIP LOCKED` przy przypisaniu zadania do pickera.

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

Logika w `inventory_service.py`:

- **Rezerwacja** (`reserve_stock`) — zwiększa `reserved_quantity` z blokadą wiersza (`FOR UPDATE`).
- **Kompletacja** (`commit_pick`) — zmniejsza `quantity` i `reserved_quantity`, zapis transakcji `WAVE_PICK_BATCH`.
- **Wybór partii** (`find_best_balance`) — FIFO po `expiration_date`, potem `updated_at`.
- **Constrainty BD** — `quantity ≥ 0`, `reserved_quantity ≥ 0`, `reserved_quantity ≤ quantity`.

### 3.2.3. Przyjęcia (Inbound)

_[TODO: doprecyzować przepływ receive → putaway w `inbound_service.py`]_

### 3.2.4. Zmiany magazynowe i raporty

- **Zmiana pracownika** (`user_service`) — `start_shift` / `end_shift` zapisują `ShiftEvent` (LOGIN/LOGOUT); po starcie lub końcu przerwy status ustawiany przez `floor_status_for_role` (INBOUND → RECEIVING, PACKER → SORTING, pozostali → IDLE).
- **Przerwy** — `BREAK_START` / `BREAK_END` w `shift_events`; limit `BREAK_LIMIT_MINUTES` z konfiguracji; endpointy `/users/me/break/*` i `/users/{id}/break/*`.
- **Zmiana magazynowa** (`warehouse_shift_service`) — okno operacyjne `WarehouseShift`; generator raportu (`shift_metrics_service`, `report_template`); edycja i eksport PDF (`ShiftReportEditorPage`, `ShiftReportsPage` we frontendzie).
- **Symulacja** — `simulation_service` + przełącznik w `app_settings`; domyślnie wyłączona w `APP_ENV=production`.

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/auth/login` | publiczny | Logowanie JWT (rate limit) |
| POST | `/auth/register` | ADMIN_MANAGER | Rejestracja użytkownika |
| GET/POST | `/waves` | ADMIN_MANAGER | Lista / tworzenie fali |
| GET/PATCH | `/orders`, `/orders/{id}/status` | ADMIN_MANAGER | Zamówienia |
| GET | `/inventory/`, `/inventory/transactions` | ADMIN_MANAGER, INBOUND_OPERATOR | Stany i historia |
| POST | `/terminal/login`, GET `/terminal/tasks/next` | PICKER, PACKER_DISPATCHER | Terminal kompletacji |
| GET/PUT | `/warehouse-shifts/{id}/report` | ADMIN_MANAGER | Raport zmiany |
| POST | `/users/shift/start`, `/users/me/break/*` | ADMIN_MANAGER / pracownik | Zmiana i przerwy |
| GET/POST | `/dashboard/simulation` | ADMIN_MANAGER | Stan symulacji |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
