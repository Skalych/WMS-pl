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

### 2026-08-29 — Partial waves, bezpieczeństwo, raporty zmian, micro-tasks UI

- **Backend:** partial waves (`wave_service.py`), blokady inventory (`inventory_service.py`), FIFO claim (`terminal_service.py`), moduł raportów zmian magazynowych (`warehouse_shifts.py`), `end-all-shifts`, wspólny floor status.
- **Migracje:** `f7a1b2c3d4e5` (warehouse_shifts), `a3b4c5d6e7f8` (token_version), `b1c2d3e4f5a6` (partial waves + inventory CHECK).
- **Bezpieczeństwo:** wymagany `SECRET_KEY`, CORS allowlist, rate limit logowania, seed guard, unieważnianie JWT przez `token_version`.
- **Infrastruktura:** `docker-compose.prod.yml`, nginx reverse proxy, symulacja wyłączona domyślnie w production.
- **Frontend:** strony raportów (`ShiftReportsPage`, `ShiftReportEditorPage`), rozwijane micro-tasks na `Waves.tsx`, usunięto fullscreen board.
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
