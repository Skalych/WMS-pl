# Raport zmian dla pracy inżynierskiej

Krótkie wpisy do rozdziału «Postęp prac» / «Implementacja». Nowe wpisy dodawane są **na górze**.

---

## Format wpisu

```markdown
### YYYY-MM-DD — krótki tytuł

- Co zrobiono
- Jakie pliki/moduły dotknięto
- Co zaktualizowano w docs/thesis/ (jeśli dotyczy)
```

---

## Wpisy

### 2026-08-29 — Synchronizacja dokumentacji po tygodniu rozwoju

- **Terminal kompletacji** — sesje `PickSession`, przepływ kroków (`PickStep`), claim FIFO, skanowanie lokalizacji/SKU/bufora (`pick_session_service`, `routers/terminal.py`).
- **Kontenery i etykiety** — `Container`, `IssuedContainerLabel`, moduł packera (`container_service`, `routers/packer.py`, `PackerLabels.tsx`).
- **Fale** — partial waves, anulowanie fali, rozwijane micro-tasks w UI (`wave_service`, `Waves.tsx`).
- **Inventory** — rezerwacje `reserved_quantity`, constrainty na `inventory_balances`.
- **Zmiany i raporty** — `warehouse_shifts`, generator raportów PDF, `end-all-shifts`, usunięcie fullscreen board.
- **Bezpieczeństwo** — `SECRET_KEY` wymagany, CORS allowlist, rate limit logowania, `token_version` JWT.
- **Infrastruktura** — `docker-compose.prod.yml` (Postgres + backend + nginx).
- Zaktualizowano: `01_architecture.md`, `02_database.md`, `03_modules_logic.md`, `04_security_roles.md`.

### 2026-08-29 — Korekta terminologii: praca inżynierska

- Zastąpiono określenie «praca dyplomowa» → «praca inżynierska» w README i changelog.

### 2026-08-29 — Aktywacja Cursor Automation (Generate docs)

- Włączono automatyzację aktualizacji dokumentacji po pushu do `main`.
- Trigger testowy — weryfikacja działania agenta.

### 2026-08-29 — Przełączenie dokumentacji na język polski

- Przetłumaczono szablony w `docs/thesis/` z ukraińskiego na polski.
- Zaktualizowano zasady dla agenta w `README.md` (język: polski).

### 2026-08-29 — Utworzono strukturę dokumentacji technicznej

- Utworzono katalog `docs/thesis/` z rozdziałami: architektura, BD, moduły, bezpieczeństwo, changelog.
- Przygotowano szablony do automatycznej aktualizacji przez Cursor Automation.
