# Raport zmian dla pracy dyplomowej

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

### 2026-08-29 — Synchronizacja dokumentacji po tygodniu zmian

- **Bezpieczeństwo:** `SECRET_KEY` wymagany z env, rate limiting logowania, CORS allowlist, `token_version` w JWT, seed guard.
- **WMS floor ops:** częściowe fale (`PARTIALLY_IN_WAVE`), rezerwacja stanów (`reserved_quantity`), FIFO claim zadań terminalowych.
- **Raporty zmian:** modele `warehouse_shifts` / `shift_report_drafts`, eksport PDF, frontend `ShiftReportsPage`.
- **Infrastruktura:** `docker-compose.prod.yml`, Dockerfile backend/frontend, nginx reverse proxy (API + WebSocket).
- **Ustawienia:** tabela `app_settings`, symulacja wyłączona domyślnie w production.
- Zaktualizowano: `01_architecture.md`, `02_database.md`, `03_modules_logic.md`, `04_security_roles.md`.

### 2026-08-29 — Aktywacja Cursor Automation (Generate docs)

- Włączono automatyzację aktualizacji dokumentacji po pushu do `main`.
- Trigger testowy — weryfikacja działania agenta.

### 2026-08-29 — Przełączenie dokumentacji na język polski

- Przetłumaczono szablony w `docs/thesis/` z ukraińskiego na polski.
- Zaktualizowano zasady dla agenta w `README.md` (język: polski).

### 2026-08-29 — Utworzono strukturę dokumentacji technicznej

- Utworzono katalog `docs/thesis/` z rozdziałami: architektura, BD, moduły, bezpieczeństwo, changelog.
- Przygotowano szablony do automatycznej aktualizacji przez Cursor Automation.
