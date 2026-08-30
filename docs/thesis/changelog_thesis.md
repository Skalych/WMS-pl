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

### 2026-08-30 — Terminal kompletacji, bezpieczeństwo i stos produkcyjny

- **Backend:** partial waves (`allocated_quantity`, `PARTIALLY_IN_WAVE`), rezerwacja stanów, FIFO claim zadań, anulowanie fal; moduł `packer` (etykiety kontenerów); sesja kompletacji `PickSession` + `PickStep`; `end-all-shifts`; wzmocnienie bezpieczeństwa (SECRET_KEY, CORS allowlist, rate limit logowania, `token_version`).
- **Frontend:** strona `PackerLabels`, rozwijane micro-taski na `Waves`, raporty zmian, usunięcie fullscreen board.
- **Android:** aplikacja terminala (Compose) — przepływ kompletacji, odświeżanie sesji po zmianie linii.
- **Infrastruktura:** `docker-compose.prod.yml` (Postgres + backend + nginx), symulacja domyślnie wyłączona w produkcji.
- **Migracje:** `b1c2d3e4f5a6`, `g8h9i0j1k2l3`, `h9i0j1k2l3m4`, `a3b4c5d6e7f8`.
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
