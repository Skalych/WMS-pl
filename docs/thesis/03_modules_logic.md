# 3. Moduły i logika biznesowa

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-08-30_

## 3.1. Mapa modułów

| Moduł | Router | Service | Przeznaczenie |
|-------|--------|---------|---------------|
| Auth | `routers/auth.py` | — | Logowanie, JWT |
| Users | `routers/users.py` | `user_service.py` | Profile, pracownicy |
| Inventory | `routers/inventory.py` | `inventory_service.py` | Stany magazynowe, blokady |
| Inbound | `routers/inbound.py` | `inbound_service.py` | Przyjęcie towaru |
| Orders | `routers/orders.py` | `order_service.py` | Zamówienia |
| Waves | `routers/waves.py` | `wave_service.py` | Fale, micro-tasks |
| Terminal | `routers/terminal.py` | `pick_session_service.py`, `terminal_service.py` | Terminal kompletacji (sesja krokowa + legacy scan) |
| Packer | `routers/packer.py` | `container_service.py` | Etykiety kontenerów, lista buforów |
| Dashboard | `routers/dashboard.py` | — | Analityka |
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py` | Zmiany magazynowe |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | — | `simulation_service.py` | Symulacja magazynu |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

- **Tworzenie fali** (`wave_service.create_wave`) — alokacja stanów z `inventory_balances` (rezerwacja `reserved_quantity`), generacja `micro_tasks` i pozycji.
- **Partial waves** — status zamówienia `PARTIALLY_IN_WAVE` gdy tylko część linii została zaalokowana; `OrderItem.allocated_quantity` śledzi postęp.
- **Anulowanie** (`POST /waves/{id}/cancel`) — zwolnienie rezerwacji, status `CANCELLED` dla fali i zadań (tylko przed zakończeniem pickingu).
- **UI** — lista fal z rozwijalnymi micro-taskami i postępem (`calculate_wave_progress`, `calculate_micro_task_progress` w `routers/waves.py`).

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

- **Rezerwacja** (`reserve_stock`) — zwiększa `reserved_quantity` przy tworzeniu fali.
- **Zwolnienie** (`release_reserved_stock`) przy anulowaniu fali lub korekcie alokacji.
- **Commit pick** (`commit_pick`) — zmniejsza `quantity` i `reserved_quantity`, rejestruje `InventoryTransaction` typu `WAVE_PICK_BATCH`.
- **FIFO claim zadań** (`terminal_service.get_next_task`) — `ORDER BY Wave.created_at, MicroTask.created_at` z `FOR UPDATE SKIP LOCKED`.

### 3.2.3. Przyjęcia (Inbound)

_[TODO: doprecyzować po audycie `inbound_service.py`]_

### 3.2.4. Zmiany magazynowe i raporty

- **Shift / break** — `user_service`: `start_shift`, `end_shift`, `end_all_shifts`, `start_break`/`end_break`; jeden commit transakcji dla zmiany statusu i przerwy.
- **Shift clock (terminal)** — `pick_session_service.clock_shift` — informacyjne `SHIFT_CLOCK_IN`/`OUT`, nie blokuje pickingu.
- **Metryki live** — `publish_shift_live_update` po `confirm_quantity`; WebSocket w `shift_ws.py`.
- **Raporty zmian** — `warehouse_shift_service`, strony `ShiftReportsPage`, `ShiftReportEditorPage`.

### 3.2.5. Terminal kompletacji (PickSession)

Kroki enum `PickStep`: `CONTAINER_SCAN` → `GO_TO_LOCATION` → `LOCATION_VERIFY` → `SKU_SCAN` → `QUANTITY_CONFIRM` → `BUFFER_SCAN` → `COMPLETED`.

- **Claim** (`POST /terminal/tasks/{id}/claim`) — tworzy `PickSession`, przypisuje micro-task.
- **Skan** (`POST /terminal/session/scan`) — aktywacja kontenera z `issued_container_labels`, weryfikacja lokalizacji/SKU/bufora.
- **Ilość** (`POST /terminal/session/confirm-quantity`) — `commit_pick`, przejście do następnej linii; `_resolve_current_item` zapobiega nieaktualnym danym ORM po commit.
- **Android** — `android/.../TerminalViewModel.kt` konsumuje te endpointy; UI krokowe w `TerminalScreens.kt`.

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Role | Opis |
|--------|---------|------|------|
| POST | `/api/v1/waves` | ADMIN_MANAGER | Utworzenie fali |
| POST | `/api/v1/waves/{id}/cancel` | ADMIN_MANAGER | Anulowanie fali |
| POST | `/api/v1/packer/containers/generate` | PACKER_DISPATCHER, ADMIN_MANAGER | Generowanie kodów etykiet |
| GET | `/api/v1/packer/buffers` | PACKER_DISPATCHER, ADMIN_MANAGER | Kontenery na buforach |
| POST | `/api/v1/terminal/tasks/{id}/claim` | PICKER, PACKER_DISPATCHER, ADMIN_MANAGER | Claim micro-task + sesja |
| GET | `/api/v1/terminal/session/current` | terminal roles | Bieżąca sesja pick |
| POST | `/api/v1/terminal/session/scan` | terminal roles | Skan w kroku sesji |
| POST | `/api/v1/terminal/session/confirm-quantity` | terminal roles | Potwierdzenie ilości |
| POST | `/api/v1/users/shift/end-all` | ADMIN_MANAGER | Zakończenie wszystkich otwartych zmian |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
