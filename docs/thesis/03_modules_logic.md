# 3. Moduły i logika biznesowa

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-08-29_

## 3.1. Mapa modułów

| Moduł | Router | Service | Przeznaczenie |
|-------|--------|---------|---------------|
| Auth | `routers/auth.py` | — | Logowanie, JWT |
| Users | `routers/users.py` | `user_service.py` | Profile, pracownicy |
| Inventory | `routers/inventory.py` | `inventory_service.py` | Stany magazynowe, blokady |
| Inbound | `routers/inbound.py` | `inbound_service.py` | Przyjęcie towaru |
| Orders | `routers/orders.py` | `order_service.py` | Zamówienia |
| Waves | `routers/waves.py` | `wave_service.py` | Fale, micro-tasks, anulowanie |
| Terminal | `routers/terminal.py` | `terminal_service.py`, `pick_session_service.py` | Terminal kompletacji, sesje pick |
| Packer | `routers/packer.py` | `container_service.py` | Etykiety kontenerów, bufor |
| Dashboard | `routers/dashboard.py` | — | Analityka |
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py` | Zmiany magazynowe |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | — | `simulation_service.py` | Symulacja magazynu |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

- **Tworzenie fali** (`wave_service.create_wave`) — alokacja częściowa: zamówienia w statusie `PENDING` lub `PARTIALLY_IN_WAVE`; rezerwacja stanów przez `inventory_service.reserve_stock`; podział na micro-tasks wg objętości (`MAX_VOLUME_PER_TASK`).
- **Status zamówienia** — `allocated_quantity` na `order_items`; `_recompute_order_status` ustawia `PARTIALLY_IN_WAVE` / `IN_WAVE`.
- **FIFO claim** — `pick_session_service.list_available_tasks` sortuje po `created_at ASC`; `claim_task` przypisuje zadanie pickerowi.
- **Anulowanie** (`POST /waves/{id}/cancel`, tylko `ADMIN_MANAGER`) — `cancel_wave`: status `CANCELLED`, zwolnienie rezerwacji (`release_reserved_stock`), reset `allocated_quantity`, anulowanie aktywnych sesji pick.

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

- **Rezerwacja** — `reserve_stock` z `SELECT … FOR UPDATE`; zwiększa `reserved_quantity`.
- **Zwolnienie** — `release_reserved_stock` przy anulowaniu fali lub cofnięciu alokacji.
- **Pick** — `commit_pick` odejmuje ilość i rezerwację po potwierdzeniu na terminalu.
- **Ograniczenia BD** — CHECK: `quantity ≥ 0`, `reserved_quantity ≥ 0`, `reserved_quantity ≤ quantity` (migracja `b1c2d3e4f5a6`).

### 3.2.3. Przyjęcia (Inbound)

Przyjęcie towaru aktualizuje salda i rejestruje transakcje `RECEIPT` / `PUTAWAY`. Szczegóły endpointów: `routers/inbound.py`, `inbound_service.py`.

### 3.2.4. Zmiany magazynowe i raporty

- **Zmiana magazynowa** (`warehouse_shift_service`) — agregat `warehouse_shifts` z metrykami; raport draft (`shift_report_drafts`), eksport PDF.
- **Zmiana pracownika** (`user_service`) — `shift/start`, `shift/end`, `shift/end-all`; przerwy `break/start` / `break/end`; wspólny `floor_status_for_role`.
- **Status online** — w liście zespołu pracownik bez aktywnej zmiany wyświetlany jako `OFFLINE` (`enrich_user` / `get_team_members`).
- **Terminal** — `clock_shift` rejestruje `SHIFT_CLOCK_IN` / `SHIFT_CLOCK_OUT` (informacyjnie).

### 3.2.5. Kontenery i sesja kompletacji

- **Etykiety** (`container_service.generate_label_batch`) — 8-znakowe kody w `issued_container_labels`.
- **Aktywacja** — skan pickera tworzy rekord `containers` i konsumuje etykietę.
- **Kroki sesji** (`PickStep`) — `CONTAINER_SCAN` → `GO_TO_LOCATION` → `LOCATION_VERIFY` (kod 90XYZ, `utils/location_barcode.py`) → `SKU_SCAN` → `QUANTITY_CONFIRM` → `BUFFER_SCAN` → `COMPLETED`.

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/api/v1/waves/{id}/cancel` | ADMIN_MANAGER | Anulowanie fali |
| POST | `/api/v1/packer/containers/generate` | PACKER_DISPATCHER, ADMIN_MANAGER | Generowanie etykiet kontenerów |
| GET | `/api/v1/packer/buffers` | PACKER_DISPATCHER, ADMIN_MANAGER | Lista kontenerów w buforze |
| GET | `/api/v1/terminal/tasks/available` | PICKER, PACKER_DISPATCHER, ADMIN_MANAGER | Dostępne micro-tasks (FIFO) |
| POST | `/api/v1/terminal/tasks/{id}/claim` | j.w. | Przejęcie zadania, start sesji |
| GET | `/api/v1/terminal/session/current` | j.w. | Bieżąca sesja pick |
| POST | `/api/v1/terminal/session/scan` | j.w. | Skan (kontener / lokalizacja / SKU / bufor) |
| POST | `/api/v1/users/shift/end-all` | ADMIN_MANAGER | Zakończenie zmiany wszystkich pracowników |
| GET | `/api/v1/warehouse-shifts/{id}/report` | ADMIN_MANAGER | Raport zmiany magazynowej |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
