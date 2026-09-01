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

### 2026-09-01 — Operacje magazynowe: partial waves, terminal, etykiety, prod stack

- **Partial waves i rezerwacja stanów** — migracja `b1c2d3e4f5a6`, `allocated_quantity`, status `PARTIALLY_IN_WAVE`, CHECK constraints na `inventory_balances`.
- **Terminal kompletacji** — modele `Container`, `PickSession`, enum `PickStep`; router `/terminal/*`, serwis `pick_session_service` (claim FIFO, sesja krokowa, wznowienie po restarcie).
- **Etykiety kontenerów** — `IssuedContainerLabel`, router `/packer/*`, strona `PackerLabels.tsx`.
- **Anulowanie fal** — `POST /waves/{id}/cancel`, UI na stronie Waves (rozwijane micro-tasks).
- **Zmiany pracowników** — `end-all-shifts`, wspólny floor status, raporty zmian (seed + UI).
- **Infrastruktura prod** — `docker-compose.prod.yml`, `frontend/nginx.conf` (reverse proxy API/WS).
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
