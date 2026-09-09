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
| Terminal | `routers/terminal.py` | `terminal_service.py`, `pick_session_service.py` | Terminal kompletacji (sesje, skany) |
| Packer | `routers/packer.py` | `container_service.py` | Etykiety kontenerów, widok buforów |
| Dashboard | `routers/dashboard.py` | — | Analityka, symulacja |
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py`, `shift_metrics_service.py`, `report_export_service.py` | Zmiany magazynowe, raporty PDF |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | — | `simulation_service.py` | Symulacja magazynu |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

- **Tworzenie fali** (`wave_service.create_wave`) — alokuje dostępny stan magazynowy per pozycja zamówienia; obsługuje **partial waves** (status `PARTIALLY_IN_WAVE`, gdy brak pełnej alokacji).
- **Rezerwacja** — `inventory_service.reserve_stock` zwiększa `reserved_quantity` na `InventoryBalance`.
- **Micro-tasks** — podział wg pojemności wolumetrycznej (`MAX_VOLUME_PER_TASK`); każda linia powiązana z `order_item_id`.
- **Anulowanie** (`POST /waves/{id}/cancel`) — zwalnia nieskompletowane rezerwacje, anuluje sesje pickera, aktualizuje status zamówień.
- **UI** (`frontend/src/pages/Waves.tsx`) — rozwijana lista micro-tasks z postępem per zadanie.

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

- **Blokady** — `reserve_stock` / `release_reserved_stock` / `commit_pick` operują na `reserved_quantity`.
- **Constrainty** — `quantity ≥ 0`, `reserved_quantity ≥ 0`, `reserved_quantity ≤ quantity`.
- **Wybór lokalizacji** — `find_best_balance` wybiera wiersz z wystarczającym stanem dostępnym (z blokadą `FOR UPDATE`).

### 3.2.3. Terminal kompletacji (Pick Session)

Przepływ kroków (`PickStep` w `pick_session_service.py`):

`CONTAINER_SCAN` → `GO_TO_LOCATION` → `LOCATION_VERIFY` → `SKU_SCAN` → `QUANTITY_CONFIRM` → (następna linia lub `BUFFER_SCAN`) → `COMPLETED`.

- **Claim FIFO** — `list_available_tasks` sortuje `MicroTask.created_at ASC`; picker wybiera zadanie przez `POST /terminal/tasks/{id}/claim`.
- **Etykieta kontenera** — skan aktywuje `IssuedContainerLabel` → tworzy `Container` (`container_service.activate_container_on_scan`).
- **Legacy** — stare endpointy `/terminal/tasks/next` i `/terminal/tasks/{id}/scan` zachowane dla kompatybilności.

### 3.2.4. Zmiany magazynowe i raporty

- **Zmiana pracownika** — `user_service`: start/koniec zmiany, przerwy (`ShiftEvent`), `POST /users/shift/end-all` (admin).
- **Floor status** — `floor_status_for_role` ustawia `WorkerStatus` po starcie zmiany / końcu przerwy.
- **Raporty** — `warehouse_shift_service` generuje draft raportu; eksport PDF przez `report_export_service`; UI: `ShiftReportsPage`, `ShiftReportEditorPage`.

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/auth/login` | publiczny | Logowanie web (rate limit) |
| POST | `/terminal/login` | publiczny | Logowanie terminala PIN (rate limit) |
| GET | `/terminal/tasks/available` | PICKER+ | Lista zadań FIFO |
| POST | `/terminal/tasks/{id}/claim` | PICKER+ | Przejęcie zadania, start sesji |
| POST | `/terminal/session/scan` | PICKER+ | Skan wg bieżącego kroku |
| POST | `/terminal/session/confirm-quantity` | PICKER+ | Potwierdzenie ilości pick |
| POST | `/waves` | ADMIN_MANAGER | Utworzenie fali |
| POST | `/waves/{id}/cancel` | ADMIN_MANAGER | Anulowanie fali |
| POST | `/packer/containers/generate` | PACKER_DISPATCHER+ | Batch etykiet kontenerów |
| GET | `/warehouse-shifts` | ADMIN_MANAGER | Lista zmian magazynowych |
| POST | `/users/shift/end-all` | ADMIN_MANAGER | Zakończenie zmian wszystkich pracowników |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
