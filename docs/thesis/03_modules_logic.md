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
| Warehouse shifts | `routers/warehouse_shifts.py` | `warehouse_shift_service.py`, `shift_metrics_service.py`, `report_export_service.py` | Okno zmiany magazynowej, raporty, eksport |
| Shift live | `routers/shift_ws.py` | `shift_live_service.py` | Monitoring WebSocket |
| Simulation | — | `simulation_service.py` | Symulacja magazynu |

## 3.2. Kluczowa logika biznesowa

### 3.2.1. Fale kompletacji (Waves)

- Tworzenie fali (`wave_service.create_wave`) — zamówienia w statusie `PENDING` lub `PARTIALLY_IN_WAVE`.
- **Partial waves** — alokacja per pozycja (`allocated_quantity` vs `requested_quantity`); status zamówienia `IN_WAVE` lub `PARTIALLY_IN_WAVE`.
- Podział na `MicroTask` wg limitu objętości (`MAX_VOLUME_PER_TASK`); pozycje powiązane z `order_item_id`.
- Rezerwacja stanów przez `inventory_service.reserve_stock` przed utworzeniem `MicroTaskItem`.

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

- `InventoryBalance`: `quantity`, `reserved_quantity`; constrainty DB zapobiegają ujemnym wartościom i rezerwacji > stan.
- `reserve_stock` — blokada wiersza (`SELECT … FOR UPDATE`), zwiększenie `reserved_quantity`.
- `commit_pick` — realizacja kompletacji: zmniejszenie `quantity` i `reserved_quantity`, wpis `InventoryTransaction` typu `WAVE_PICK_BATCH`.
- `find_best_balance` — wybór lokalizacji z największym dostępnym stanem (partial allocation gdy brak pełnej ilości).

### 3.2.3. Przyjęcia (Inbound)

_[TODO: doprecyzować flow receive → putaway]_

### 3.2.4. Zmiany magazynowe i raporty

- **Zmiana pracownika** (`Shift`, `ShiftEvent`) — start/koniec, przerwy (`BREAK_START`/`BREAK_END`); `floor_status_for_role()` ustawia status po starcie zmiany (np. `RECEIVING` dla inbound operatora).
- **Zmiana magazynowa** (`WarehouseShift`) — tworzona automatycznie (`ensure_open_warehouse_shift`), zamykana gdy wszyscy pracownicy offline (`maybe_close_warehouse_shift`); `backfill_from_worker_shifts` uzupełnia historyczne dni.
- **Raporty** — szkic JSON w `ShiftReportDraft`; metryki (`items_picked`, `hourly_buckets`, `top_pickers`) z `shift_metrics_service`; eksport PDF/DOCX/HTML.
- **Admin** — `POST /users/shift/end-all` kończy wszystkie aktywne zmiany pracowników.
- **Seed demo** — `seed.py` generuje 7 historycznych `WarehouseShift` z metrykami (strona `/reports`).

### 3.2.5. Terminal kompletacji

- `GET /terminal/tasks/next` — FIFO claim: najstarsza fala (`Wave.created_at`), najstarsze zadanie (`MicroTask.created_at`), `FOR UPDATE SKIP LOCKED`.
- `POST /terminal/tasks/{id}/scan` — walidacja SKU/lokalizacji, `commit_pick`, aktualizacja metryk zmiany i broadcast WebSocket.

## 3.3. Endpointy API (przegląd)

| Metoda | Ścieżka | Rola | Opis |
|--------|---------|------|------|
| POST | `/auth/login` | publiczny | Logowanie JWT (rate limit) |
| POST | `/waves` | ADMIN_MANAGER | Utworzenie fali z listy `order_ids` |
| GET | `/terminal/tasks/next` | PICKER, … | Pobranie / claim następnego zadania |
| POST | `/terminal/tasks/{id}/scan` | PICKER, … | Skan kompletacji |
| POST | `/users/shift/start`, `/shift/end` | ADMIN_MANAGER | Start/koniec zmiany zespołu |
| POST | `/users/shift/end-all` | ADMIN_MANAGER | Koniec wszystkich aktywnych zmian |
| GET | `/warehouse-shifts` | ADMIN_MANAGER | Lista zmian magazynowych |
| GET/PUT | `/warehouse-shifts/{id}/report` | ADMIN_MANAGER | Odczyt/edycja szkicu raportu |
| POST | `/warehouse-shifts/{id}/report/export` | ADMIN_MANAGER | Eksport PDF/DOCX/HTML |

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
