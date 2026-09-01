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

### 2026-09-01 — Terminal kompletacji, fale częściowe, konteneryzacja prod

- **Infrastruktura** — `docker-compose.prod.yml`, Dockerfile backend/frontend, nginx SPA z proxy `/api/v1`.
- **WMS core** — częściowe fale (`PARTIALLY_IN_WAVE`, `allocated_quantity`), rezerwacje stanów, FIFO claim zadań, anulowanie fal.
- **Terminal** — `pick_sessions`, `containers`, `issued_container_labels`; API `/terminal/*` i `/packer/*`; wznowienie sesji po restarcie; status zmiany na terminalu.
- **Frontend** — rozwijane micro-tasks na `Waves.tsx`, strona `PackerLabels`, `end-all-shifts`, raporty zmian.
- **Android** — aplikacja terminala w `android/` (Kotlin, Compose, Zebra DataWedge).
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
