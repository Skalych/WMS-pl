# 3. Moduły i logika biznesowa

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-09-01

## 3.1. Mapa modułów

| Moduł | Router | Service | Przeznaczenie |
|-------|--------|---------|---------------|
| Auth | `routers/auth.py` | — | Logowanie, JWT |
| Users | `routers/users.py` | `user_service.py` | Profile, pracownicy |
| Inventory | `routers/inventory.py` | `inventory_service.py` | Stany magazynowe, blokady |
| Inbound | `routers/inbound.py` | `inbound_service.py` | Przyjęcie towaru |
| Orders | `routers/orders.py` | `order_service.py` | Zamówienia |
| Waves | `routers/waves.py` | `wave_service.py` | Fale, micro-tasks, anulowanie |
| Terminal | `routers/terminal.py` | `pick_session_service.py`, `terminal_service.py` | Terminal kompletacji (sesja krok po kroku) |
| Packer | `routers/packer.py` | `container_service.py` | Generowanie etykiet kontenerów, lista buforów |
| Dashboard | `routers/dashboard.py` | — | Analityka |
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py` | Zmiany magazynowe |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | — | `simulation_service.py` | Symulacja magazynu |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

- **Tworzenie fali** (`wave_service.create_wave`) — dla zamówień w statusie `PENDING` lub `PARTIALLY_IN_WAVE`; alokuje dostępny stan przez `reserve_stock`, dzieli linie na `MicroTask` wg limitu objętości (`MAX_VOLUME_PER_TASK`).
- **Fale częściowe** — jeśli brak pełnego stanu, linia dostaje częściową alokację; zamówienie przechodzi w `PARTIALLY_IN_WAVE` lub `IN_WAVE`.
- **FIFO claim** — `pick_session_service.list_available_tasks` sortuje `MicroTask` po `created_at`; picker przejmuje zadanie przez `claim_task`.
- **Anulowanie** (`cancel_wave`) — zwalnia rezerwacje, aktualizuje statusy zamówień; endpoint `POST /waves/{id}/cancel` (ADMIN_MANAGER).
- **UI** — strona `Waves.tsx` pokazuje rozwijane micro-tasks z postępem.

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

- **Rezerwacja** (`reserve_stock`) — `SELECT … FOR UPDATE` na `inventory_balances`, zwiększa `reserved_quantity`.
- **Kompletacja** (`commit_pick`) — zmniejsza `quantity` i `reserved_quantity`, zapisuje transakcję `WAVE_PICK_BATCH`.
- **Zwolnienie** (`release_reserved_stock`) — przy anulowaniu fali.
- **Wybór lokalizacji** (`find_best_balance`) — FIFO po lokalizacji z dostępnym stanem.

### 3.2.3. Przyjęcia (Inbound)

_[TODO: doprecyzować przepływ receive → putaway]_

### 3.2.4. Zmiany magazynowe i raporty

- **Zmiana pracownika** — `user_service.start_shift` / `end_shift`; jeden commit na start/koniec zmiany i przerwy (`floor_status_for_role`).
- **Zakończenie wszystkich zmian** — `POST /users/shift/end-all` (ADMIN_MANAGER).
- **Terminal clock** — `pick_session_service.clock_shift` + `GET /terminal/shift/status` (informacyjne, nie blokuje kompletacji).
- **Raporty zmian** — `warehouse_shift_service` + seed raportów; strony `ShiftReportsPage`, `ShiftReportEditorPage`.

### 3.2.5. Terminal kompletacji i kontenery

- **Sesja** — kroki `PickStep`: `CONTAINER_SCAN` → `GO_TO_LOCATION` → `LOCATION_VERIFY` → `SKU_SCAN` → `QUANTITY_CONFIRM` → `BUFFER_SCAN` → `COMPLETED`.
- **Etykiety** — packer generuje `issued_container_labels`; `activate_container_on_scan` tworzy `Container` przy pierwszym skanie.
- **Wznowienie** — `get_current_session` odtwarza sesję po restarcie (`_restore_orphan_session`).
- **Klient Android** — `android/` (Kotlin + Compose, skaner Zebra DataWedge).

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/waves` | ADMIN_MANAGER | Utworzenie fali |
| POST | `/waves/{id}/cancel` | ADMIN_MANAGER | Anulowanie fali |
| GET | `/waves/{id}` | zalogowany | Szczegóły fali z micro-tasks |
| POST | `/packer/containers/generate` | PACKER_DISPATCHER, ADMIN_MANAGER | Partia etykiet kontenerów |
| GET | `/packer/buffers` | PACKER_DISPATCHER, ADMIN_MANAGER | Kontenery na buforach |
| GET | `/terminal/tasks/available` | PICKER, PACKER_DISPATCHER, ADMIN_MANAGER | Lista zadań FIFO |
| POST | `/terminal/tasks/{id}/claim` | j.w. | Przejęcie zadania, start sesji |
| GET | `/terminal/session/current` | j.w. | Bieżąca sesja (z wznowieniem) |
| POST | `/terminal/session/scan` | j.w. | Skan w bieżącym kroku |
| POST | `/terminal/session/confirm-quantity` | j.w. | Potwierdzenie ilości |
| POST | `/users/shift/end-all` | ADMIN_MANAGER | Zakończenie wszystkich aktywnych zmian |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
