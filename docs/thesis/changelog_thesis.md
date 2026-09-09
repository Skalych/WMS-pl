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

### 2026-08-31 — Synchronizacja po tygodniu rozwoju (terminal, fale, bezpieczeństwo)

- **Backend:** częściowe fale i rezerwacja stanów; terminal kompletacji (`PickSession`, `PickStep`); etykiety kontenerów (`IssuedContainerLabel`); anulowanie fal; FIFO claim zadań; wznowienie sesji po restarcie; `token_version`, rate limit logowania, seed guard; stack produkcyjny Docker+nginx.
- **Frontend:** strony `PackerLabels`, rozwijane micro-taski na `Waves`, zakończenie wszystkich zmian, poprawki UI (Inbound, Inventory, Orders, Employees).
- **Migracje:** `a3b4c5d6e7f8`, `b1c2d3e4f5a6`, `g8h9i0j1k2l3`, `h9i0j1k2l3m4`.
- **Docs:** zaktualizowano `01_architecture.md`, `02_database.md`, `03_modules_logic.md`, `04_security_roles.md`.

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
