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

### 2026-08-30 — Terminal kompletacji, partial waves, hardening bezpieczeństwa

- **Terminal pickingu** — modele `PickSession`, `Container`, `IssuedContainerLabel`; sesja krokowa (`pick_session_service`), aplikacja Android (`android/`).
- **Fale** — partial waves (`PARTIALLY_IN_WAVE`, `allocated_quantity`), anulowanie fal, rozwijalne micro-tasks w UI.
- **Inventory** — rezerwacja/zwolnienie stanów, CHECK constraints; FIFO claim zadań (`FOR UPDATE SKIP LOCKED`).
- **Packer** — generowanie etykiet kontenerów (`/packer/containers/generate`), strona `PackerLabels`.
- **Zmiany** — `end_all_shifts`, usunięcie fullscreen board; raporty zmian i wykresy.
- **Bezpieczeństwo** — wymagany `SECRET_KEY`, `token_version` w JWT, rate limit logowania, CORS allowlist, seed guard.
- **Infra** — `docker-compose.prod.yml`, nginx reverse proxy API/WS, symulacja wyłączona domyślnie w prod.
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
