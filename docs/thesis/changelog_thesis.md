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

### 2026-08-29 — Synchronizacja po tygodniu rozwoju (push main)

- **Bezpieczeństwo:** `SECRET_KEY` z env, CORS allowlist, rate limit logowania, `token_version` + unieważnianie JWT, seed guard (`ALLOW_SEED`, blokada production).
- **BD:** migracje `warehouse_shifts`, `token_version`, partial waves (`PARTIALLY_IN_WAVE`, `allocated_quantity`, constrainty inventory).
- **Moduły:** partial waves + rezerwacja stanów, FIFO claim zadań terminala, generator raportów zmian (PDF/DOCX/HTML), `end-all-shifts`, backfill historycznych zmian magazynowych.
- **Infra:** `docker-compose.prod.yml`, Dockerfile backend/frontend, CI GitHub Actions; skrypt `wms.command` zamiast Makefile.
- **Frontend:** strony `/reports`, `/reports/:shiftId`, odświeżony layout tabel (Dashboard, Employees, Waves, Inventory, Orders).
- **Seed:** 7 historycznych `WarehouseShift` z metrykami demo dla raportów.
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
