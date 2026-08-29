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

### 2026-08-29 — Synchronizacja dokumentacji po pushu (tydzień 22–28.08)

- **Fale i stany**: częściowe fale (`PARTIALLY_IN_WAVE`, `allocated_quantity`), rezerwacja stanów, FIFO claim zadań w terminalu.
- **Zmiany i raporty**: `warehouse_shifts`, generator raportów PDF, wykresy (`ShiftReportEditorPage`), wspólny `floor_status_for_role`, przerwy z limitem minut.
- **Bezpieczeństwo**: wymagany `SECRET_KEY`, CORS allowlist, rate limit logowania, `token_version` w JWT, seed guard.
- **Infrastruktura**: `docker-compose.prod.yml`, nginx reverse proxy API/WS, symulacja wyłączona domyślnie w produkcji.
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
