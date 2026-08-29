# 3. Moduły i logika biznesowa

> Sekcja utrzymywana automatycznie. Ostatnia aktualizacja: _[TODO]_

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

_[TODO: opisać tworzenie fali, partial waves, FIFO claim]_

### 3.2.2. Ewidencja stanów magazynowych (Inventory)

_[TODO: blokady, transakcje, FIFO]_

### 3.2.3. Przyjęcia (Inbound)

_[TODO]_

### 3.2.4. Zmiany magazynowe i raporty

_[TODO: shift events, break, floor status]_

## 3.3. Endpointy API (przegląd)

_[TODO: tabela metoda + ścieżka + rola + krótki opis]_

Pełna lista — OpenAPI pod adresem `/docs` (Swagger UI) po uruchomieniu backendu.
