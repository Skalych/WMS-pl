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

### 2026-08-29 — Terminal kompletacji, etykiety kontenerów, bezpieczeństwo i raporty zmian

**Backend / BD:**
- Terminal pick: `pick_sessions`, `containers`, `issued_container_labels`; API w `pick_session_service`, `container_service`, `routers/packer.py`.
- Częściowe fale: `PARTIALLY_IN_WAVE`, `allocated_quantity`, rezerwacje inventory z CHECK constraints.
- Anulowanie fali (`cancel_wave`) ze zwolnieniem rezerwacji.
- Kody lokalizacji 90XYZ (`utils/location_barcode.py`).
- Zmiany magazynowe i raporty PDF (`warehouse_shifts`, `shift_report_drafts`).
- Hardening: `SECRET_KEY` wymagany, `token_version`, rate limit logowania, CORS allowlist, seed guard.

**Frontend / Android:**
- Strona `PackerLabels.tsx`, druk etykiet (`printContainerLabels.ts`), rozwijane micro-tasks na `Waves.tsx`.
- Aplikacja Android (`android/`) — Kotlin/Compose, Zebra DataWedge.

**Infrastruktura:**
- `docker-compose.prod.yml` — Postgres + backend + nginx (proxy API/WS).

**Zaktualizowano:** `01_architecture.md`, `02_database.md`, `03_modules_logic.md`, `04_security_roles.md`.

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
