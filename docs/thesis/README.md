# Dokumentacja techniczna pracy inżynierskiej (WMS Nexus)

Te pliki są źródłem rozdziałów pracy inżynierskiej o architekturze, bazie danych, modułach i bezpieczeństwie.

| Plik | Zawartość |
|------|-----------|
| `01_architecture.md` | Architektura, stos technologiczny, wzorce, interakcja komponentów |
| `02_database.md` | Schemat BD, encje, relacje, migracje |
| `03_modules_logic.md` | Kluczowe moduły, logika biznesowa, endpointy |
| `04_security_roles.md` | RBAC, autoryzacja, sesje/tokeny |
| `changelog_thesis.md` | Cotygodniowy raport zmian do referatu |

## Zasady aktualizacji (dla agenta)

- Pisz **po polsku**, technicznie ale zrozumiale dla pracy inżynierskiej.
- Aktualizuj tylko te sekcje, które dotyczą zmian w kodzie; nie przepisuj wszystkiego bez potrzeby.
- Dodawaj odniesienia do konkretnych ścieżek w repozytorium (`backend/…`, `frontend/…`).
- W `changelog_thesis.md` dodawaj wpis z datą i krótkim opisem zmian (dla rozdziału «Postęp prac»).
- Jeśli w kodzie brakuje informacji — oznacz `[TODO: doprecyzować]` zamiast wymyślać.
