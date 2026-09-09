# 3. Moduły i logika biznesowa

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: 2026-08-31

## 3.1. Mapa modułów

| Moduł | Router | Service | Przeznaczenie |
|-------|--------|---------|---------------|
| Auth | `routers/auth.py` | — | Logowanie, JWT |
| Users | `routers/users.py` | `user_service.py` | Profile, pracownicy |
| Inventory | `routers/inventory.py` | `inventory_service.py` | Stany magazynowe, blokady |
| Inbound | `routers/inbound.py` | `inbound_service.py` | Przyjęcie towaru |
| Orders | `routers/orders.py` | `order_service.py` | Zamówienia |
| Waves | `routers/waves.py` | `wave_service.py` | Fale, micro-tasks |
| Terminal | `routers/terminal.py` | `terminal_service.py`, `pick_session_service.py` | Terminal kompletacji (sesja krokowa) |
| Packer | `routers/packer.py` | `container_service.py` | Generowanie etykiet kontenerów, podgląd buforów |
| Dashboard | `routers/dashboard.py` | — | Analityka, symulacja (toggle) |
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py` | Zmiany magazynowe |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | — | `simulation_service.py` | Symulacja magazynu |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

- **Tworzenie fali** (`wave_service.create_wave`) — dla wybranych zamówień alokuje dostępny stan (`quantity - reserved_quantity`), rezerwuje go (`reserve_stock`) i tworzy `MicroTask` typu `BATCH_PICK`.
- **Fale częściowe** — gdy brakuje pełnego stanu, alokowana jest część linii (`allocated_quantity`); zamówienie dostaje status `PARTIALLY_IN_WAVE` i może trafić do kolejnej fali.
- **Anulowanie** (`POST /waves/{id}/cancel`) — zwalnia rezerwacje (`release_reserved_stock`), anuluje micro-taski i ustawia `WaveStatus.CANCELLED`.
- **UI** — strona `Waves.tsx` rozwija listę micro-tasków z postępem (`progress`, `micro_tasks_completed`/`total`).

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

- **Rezerwacja** (`inventory_service.reserve_stock`) — zwiększa `reserved_quantity` przy tworzeniu fali.
- **Pobranie** (`consume_reserved_stock`) — przy skanowaniu w terminalu zmniejsza `quantity` i `reserved_quantity`.
- **Zwolnienie** — przy anulowaniu fali lub błędzie (`release_reserved_stock`).
- **Constrainty BD** — `reserved_quantity >= 0`, `reserved_quantity <= quantity` (migracja `b1c2d3e4f5a6`).

### 3.2.3. Terminal kompletacji i sesja pick

Przepływ w `pick_session_service.py` (enum `PickStep`):

1. `CONTAINER_SCAN` — skan etykiety z `issued_container_labels` → tworzenie `Container`.
2. `GO_TO_LOCATION` / `LOCATION_VERIFY` — weryfikacja kodu lokalizacji (`location_barcode_matches`).
3. `SKU_SCAN` / `QUANTITY_CONFIRM` — potwierdzenie produktu i ilości (wsparcie ułamków `Numeric(10,1)`).
4. `BUFFER_SCAN` — skan bufora (`b-1-acc`, `b-2-acc`, `b-3-acc`); kontener → `AT_BUFFER`.
5. `COMPLETED` — zakończenie micro-taska.

**Wznowienie sesji** — po restarcie serwera `_restore_orphan_session` odtwarza `PickSession` dla zadania `IN_PROGRESS` bez wiersza sesji.

**FIFO claim** — `terminal_service.get_next_task` wybiera najstarszą falę (`Wave.created_at ASC`) i najstarszy wolny `MicroTask` (`FOR UPDATE SKIP LOCKED`).

### 3.2.4. Zmiany magazynowe i raporty

- **Zmiana pracownika** — `Shift` + `ShiftEvent` (LOGIN, BREAK_START/END, SHIFT_CLOCK_IN/OUT).
- **Przerwy** — `user_service.start_break` / `end_break`; limit `BREAK_LIMIT_MINUTES` (23 min).
- **Zakończenie wszystkich zmian** — `POST /users/shift/end-all` (admin).
- **Floor status** — `floor_status_for_role` ustawia `WorkerStatus` po starcie zmiany lub końcu przerwy.
- **Raporty zmian** — `warehouse_shift_service` + seed danych demo; strony `ShiftReportsPage`, `ShiftReportEditorPage`.

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/auth/login` | publiczny | Logowanie web (rate limit) |
| POST | `/terminal/login` | publiczny | Logowanie terminala (PIN, rate limit) |
| GET | `/terminal/tasks/available` | PICKER+ | Lista wolnych micro-tasków |
| POST | `/terminal/tasks/{id}/claim` | PICKER+ | Przypisanie zadania i start `PickSession` |
| GET | `/terminal/session/current` | PICKER+ | Bieżąca sesja kompletacji |
| POST | `/terminal/session/scan` | PICKER+ | Skan w bieżącym kroku |
| POST | `/packer/containers/generate` | PACKER_DISPATCHER+ | Druk etykiet kontenerów |
| POST | `/waves` | ADMIN_MANAGER | Utworzenie fali |
| POST | `/waves/{id}/cancel` | ADMIN_MANAGER | Anulowanie fali |
| POST | `/users/shift/end-all` | ADMIN_MANAGER | Zakończenie wszystkich aktywnych zmian |
| WS | `/ws/shift-live` | ADMIN_MANAGER | Live-board zmiany |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
