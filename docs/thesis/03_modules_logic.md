# 3. Moduły i logika biznesowa

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-30

## 3.1. Mapa modułów

| Moduł | Router | Service | Przeznaczenie |
|-------|--------|---------|---------------|
| Auth | `routers/auth.py` | — | Logowanie, JWT |
| Users | `routers/users.py` | `user_service.py` | Profile, pracownicy |
| Inventory | `routers/inventory.py` | `inventory_service.py` | Stany magazynowe, blokady |
| Inbound | `routers/inbound.py` | `inbound_service.py` | Przyjęcie towaru |
| Orders | `routers/orders.py` | `order_service.py` | Zamówienia |
| Waves | `routers/waves.py` | `wave_service.py` | Fale, micro-tasks, anulowanie |
| Terminal | `routers/terminal.py` | `terminal_service.py`, `pick_session_service.py` | Terminal kompletacji (sesja krok po kroku) |
| Packer | `routers/packer.py` | `container_service.py` | Generowanie etykiet kontenerów, podgląd buforów |
| Dashboard | `routers/dashboard.py` | — | Analityka |
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py` | Zmiany magazynowe |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | — | `simulation_service.py` | Symulacja magazynu |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

- **Tworzenie fali** (`wave_service.create_wave`) — zamówienia w statusie `PENDING` lub `PARTIALLY_IN_WAVE`; alokacja częściowa wg dostępnego stanu i pojemności zadania (`MAX_VOLUME_PER_TASK`).
- **Partial waves** — `OrderItem.allocated_quantity` śledzi ile jednostek trafiło do fal; status zamówienia: `PARTIALLY_IN_WAVE` / `IN_WAVE`.
- **Rezerwacja stanów** — przy alokacji wywoływane jest `inventory_service.reserve_stock` (blokada `reserved_quantity`).
- **FIFO claim** — `pick_session_service.list_available_tasks` sortuje zadania po `created_at ASC`; `claim_task` przypisuje pierwsze wolne zadanie (`PENDING`, bez `assigned_user_id`).
- **Anulowanie fali** (`POST /waves/{id}/cancel`) — zwalnia niewykonane rezerwacje, cofa `allocated_quantity`, kończy aktywne `PickSession`, ustawia `WaveStatus.CANCELLED`.

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

- **Blokady** — `reserve_stock` / `release_reserved_stock` / `commit_pick` w `inventory_service.py`; `SELECT … FOR UPDATE` na `InventoryBalance`.
- **Constrainty BD** — `quantity >= 0`, `reserved_quantity >= 0`, `reserved_quantity <= quantity`.
- **FIFO lokalizacji** — `find_best_balance` wybiera lokalizację z dostępnym stanem (przy tworzeniu fali).

### 3.2.3. Terminal kompletacji (Pick session)

Maszyna stanów `PickStep`: `CONTAINER_SCAN` → `GO_TO_LOCATION` → `LOCATION_VERIFY` → `SKU_SCAN` → `QUANTITY_CONFIRM` → `BUFFER_SCAN` → `COMPLETED`.

- Picker skanuje etykietę wydaną przez pakera (`IssuedContainerLabel` → `Container`).
- Po potwierdzeniu ilości — `inventory_service.commit_pick` i przejście do kolejnej linii lub bufora.
- Klient Android: `android/…/terminal/` (Compose); klient web: legacy endpointy w `terminal.py`.

### 3.2.4. Pakowanie i etykiety (Packer)

- `POST /packer/containers/generate` — partia kodów kreskowych (max 100) do druku (`frontend/src/pages/PackerLabels.tsx`, `printContainerLabels.ts`).
- `GET /packer/buffers` — kontenery w buforze (`AT_BUFFER`) z przypisanym pickerem i zadaniem.

### 3.2.5. Zmiany magazynowe i raporty

- **Zmiana pracownika** — `users.py`: start/end shift, break; `floor_status_for_role` ustawia status po starcie zmiany lub końcu przerwy.
- **Zakończenie wszystkich zmian** — `POST /users/shift/end-all` (`user_service.end_all_shifts`).
- **Raporty zmian** — `warehouse_shifts.py`: odczyt/edycja/reset/eksport PDF raportu (`ShiftReportDraft`).
- **Live board** — `shift_ws.py` + `dashboard/shift-live`; usunięto osobną stronę fullscreen (`ShiftBoardPage.tsx`).

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/waves` | ADMIN_MANAGER | Utworzenie fali z listy zamówień |
| POST | `/waves/{id}/cancel` | ADMIN_MANAGER | Anulowanie fali i zwolnienie rezerwacji |
| POST | `/terminal/login` | — | Logowanie terminala (email + PIN), rate limit |
| GET | `/terminal/tasks/available` | PICKER, PACKER_DISPATCHER, ADMIN_MANAGER | Lista zadań do przejęcia (FIFO) |
| POST | `/terminal/tasks/{id}/claim` | j.w. | Przejęcie zadania, start `PickSession` |
| POST | `/terminal/session/scan` | j.w. | Skan w bieżącym kroku sesji |
| POST | `/packer/containers/generate` | PACKER_DISPATCHER, ADMIN_MANAGER | Generacja etykiet kontenerów |
| POST | `/users/shift/end-all` | ADMIN_MANAGER | Zakończenie zmian wszystkich pracowników |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
