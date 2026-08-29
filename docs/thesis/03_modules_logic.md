# 3. Moduły i logika biznesowa

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: **2026-08-29**

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
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py`, `shift_metrics_service.py`, `report_export_service.py` | Zmiany magazynowe, raporty PDF |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | `routers/dashboard.py` | `simulation_service.py`, `app_settings_service.py` | Symulacja magazynu (persist w BD) |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

Tworzenie fali (`wave_service.create_wave`):

1. Wybór zamówień w statusie `PENDING` lub `PARTIALLY_IN_WAVE`.
2. Dla każdej linii zamówienia (`OrderItem`) obliczana jest potrzeba: `requested_quantity - allocated_quantity`.
3. Alokacja stanów z `inventory_balances` (dostępne = `quantity - reserved_quantity`); rezerwacja przez `inventory_service.reserve_stock`.
4. Zamówienie otrzymuje status `IN_WAVE` (pełna alokacja) lub `PARTIALLY_IN_WAVE` (częściowa).
5. Generowane są `MicroTask` i `MicroTaskItem` (z `order_item_id`); fala przechodzi do `RELEASED`.

**FIFO claim zadań** (`terminal_service.get_next_task`): picker najpierw kontynuuje własne zadanie `IN_PROGRESS`; w przeciwnym razie atomowo (`SELECT … FOR UPDATE SKIP LOCKED`) przejmuje najstarsze zadanie `PENDING` (sortowanie: `Wave.created_at`, `MicroTask.created_at`).

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

- **Rezerwacja** (`reserve_stock`) — zwiększa `reserved_quantity` przy tworzeniu fali; constrainty BD gwarantują `0 ≤ reserved ≤ quantity`.
- **Kompletacja** (`commit_pick`) — zmniejsza `quantity` i `reserved_quantity`, zapisuje transakcję `WAVE_PICK_BATCH`.
- **Dostępność** — `find_best_balance` wybiera lokalizację z największym wolnym stanem.
- **Status zapasów** — `compute_stock_status` (OK / LOW / OUT) na podstawie dostępnej ilości.

### 3.2.3. Przyjęcia (Inbound)

_[TODO: doprecyzować przepływ receive → putaway]_

### 3.2.4. Zmiany magazynowe i raporty

- **Zmiana magazynowa** (`WarehouseShift`) — okno operacyjne całego magazynu; snapshot metryk w `metrics_snapshot` (JSONB).
- **Raport** (`ShiftReportDraft`) — edytowalny szkic w `content_json`; eksport PDF przez `report_export_service`.
- **Zmiana pracownika** (`Shift`, `ShiftEvent`) — start/koniec zmiany, przerwy (`BREAK_START`/`BREAK_END`); limit przerw: `BREAK_LIMIT_MINUTES` (config).
- **Floor status** (`user_service.floor_status_for_role`) — po starcie zmiany lub końcu przerwy: PICKER → `IDLE`, INBOUND_OPERATOR → `RECEIVING`, PACKER_DISPATCHER → `SORTING`.
- **Symulacja** — domyślnie wyłączona w `APP_ENV=production`; stan runtime w `app_settings.simulation_active`, przełącznik admina: `POST /dashboard/simulation/toggle`.

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/api/v1/auth/login` | publiczny | Logowanie JWT (rate limit) |
| POST | `/api/v1/waves` | ADMIN_MANAGER | Utworzenie fali z alokacją |
| GET | `/api/v1/terminal/tasks/next` | PICKER, PACKER_DISPATCHER, ADMIN_MANAGER | Następne zadanie (FIFO claim) |
| POST | `/api/v1/terminal/tasks/{id}/scan` | PICKER, … | Skan produktu/lokalizacji |
| GET | `/api/v1/warehouse-shifts` | ADMIN_MANAGER | Lista zmian magazynowych |
| PUT | `/api/v1/warehouse-shifts/{id}/report` | ADMIN_MANAGER | Aktualizacja szkicu raportu |
| POST | `/api/v1/warehouse-shifts/{id}/report/export` | ADMIN_MANAGER | Eksport raportu (PDF) |
| GET | `/api/v1/dashboard/shift-live` | ADMIN_MANAGER | Snapshot live-boardu |
| WS | `/api/v1/ws/shift-live?token=…` | ADMIN_MANAGER | Strumień live-boardu |
| POST | `/api/v1/users/shift/start` | ADMIN_MANAGER | Start zmiany pracowników |
| POST | `/api/v1/users/me/break/start` | zalogowany | Start przerwy (self-service) |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
