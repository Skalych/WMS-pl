# 3. Moduły i logika biznesowa

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _2026-09-01_

## 3.1. Mapa modułów

| Moduł | Router | Service | Przeznaczenie |
|-------|--------|---------|---------------|
| Auth | `routers/auth.py` | — | Logowanie, JWT |
| Users | `routers/users.py` | `user_service.py` | Profile, pracownicy |
| Inventory | `routers/inventory.py` | `inventory_service.py` | Stany magazynowe, blokady |
| Inbound | `routers/inbound.py` | `inbound_service.py` | Przyjęcie towaru |
| Orders | `routers/orders.py` | `order_service.py` | Zamówienia |
| Waves | `routers/waves.py` | `wave_service.py` | Fale, micro-tasks |
| Terminal | `routers/terminal.py` | `terminal_service.py`, `pick_session_service.py` | Terminal kompletacji (login PIN, sesja, claim zadań) |
| Packer | `routers/packer.py` | `container_service.py` | Generowanie etykiet kontenerów, lista buforów |
| Dashboard | `routers/dashboard.py` | — | Analityka |
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py` | Zmiany magazynowe |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | — | `simulation_service.py` | Symulacja magazynu |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

- **Tworzenie fali** (`wave_service.create_wave`) — zamówienia w statusie `PENDING` lub `PARTIALLY_IN_WAVE`; alokacja częściowa per pozycja (`allocated_quantity`), podział na `MicroTask` wg limitu objętości.
- **Rezerwacja stanów** — przy alokacji wywołanie `inventory_service.reserve_stock`; status zamówienia: `IN_WAVE` lub `PARTIALLY_IN_WAVE`.
- **Anulowanie fali** (`POST /waves/{id}/cancel`) — zwolnienie niewykorzystanej rezerwy, reset `allocated_quantity`, anulowanie aktywnych sesji pickera.
- **UI** (`frontend/src/pages/Waves.tsx`) — rozwijane micro-tasks z postępem, przycisk anulowania fali.

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

- **Blokada wiersza** — `get_balance_at_location_for_update` + `SELECT … FOR UPDATE`.
- **Rezerwacja / zwolnienie** — `reserve_stock`, `release_reserved_stock`; `commit_pick` przy skanowaniu w terminalu.
- **Wybór lokalizacji** — `find_best_balance` preferuje największy dostępny stan (`quantity - reserved_quantity`).

### 3.2.3. Terminal kompletacji i packer

- **Claim zadania (FIFO)** — `pick_session_service.claim_task` wybiera najstarsze `MicroTask` (`order_by created_at asc`).
- **Sesja krokowa** — enum `PickStep`: skan kontenera → lokalizacja → weryfikacja → SKU → ilość → bufor → `COMPLETED`.
- **Wznowienie po restarcie** — `_restore_orphan_session` odtwarza sesję dla zadania `IN_PROGRESS`.
- **Etykiety kontenerów** — packer generuje batch kodów (`container_service.generate_label_batch`); picker aktywuje kontener skanem etykiety.

### 3.2.4. Zmiany magazynowe i raporty

- **Status floor** — `user_service.floor_status_for_role` ustawia `RECEIVING` / `SORTING` / `IDLE` po starcie zmiany lub końcu przerwy.
- **Zakończenie wszystkich zmian** — `POST /users/shift/end-all` (tylko `ADMIN_MANAGER`).
- **Przerwy** — `ShiftEvent` + `compute_break_summary`; endpointy `/users/me/break/*` i admin `/users/{id}/break/*`.
- **Raporty zmian** — `warehouse_shift_service` + seed danych demo; strony `ShiftReportsPage`, `ShiftReportEditorPage`.

### 3.2.5. Przyjęcia (Inbound)

_[TODO: doprecyzować flow receive → putaway]_

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/waves` | ADMIN_MANAGER | Utworzenie fali z alokacją częściową |
| POST | `/waves/{id}/cancel` | ADMIN_MANAGER | Anulowanie fali |
| POST | `/packer/containers/generate` | PACKER_DISPATCHER, ADMIN_MANAGER | Batch etykiet kontenerów |
| POST | `/terminal/tasks/{id}/claim` | PICKER, PACKER_DISPATCHER, ADMIN_MANAGER | Przejęcie zadania (FIFO) |
| GET | `/terminal/session/current` | j.w. | Bieżąca sesja kompletacji |
| POST | `/users/shift/end-all` | ADMIN_MANAGER | Zakończenie wszystkich otwartych zmian |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
