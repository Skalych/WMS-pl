# Схема комітів (Commit Convention)

Всі коміти (як мінорні, так і мажорні) у цьому проєкті повинні бути написані двома мовами одночасно (Українською та Англійською).

## Структура повідомлення (Commit Message Structure)

```text
<type>(<scope>): <UA короткиий опис> | <EN short description>

[UA]
<Детальний опис змін українською мовою. Що було зроблено і чому це важливо.>

[EN]
<Detailed description of the changes in English. What was done and why it is important.>
```

## Типи комітів (Types)
- `feat`: Новий функціонал (New feature)
- `fix`: Виправлення помилки (Bug fix)
- `design`: Зміни в UI/UX або CSS (UI/UX or CSS changes)
- `refactor`: Рефакторинг коду без зміни логіки (Code refactoring)
- `docs`: Оновлення документації (Documentation updates)
- `chore`: Налаштування конфігів, залежностей, тулінгу (Config, tooling, dependencies)

## Приклад (Example)
```text
feat(frontend): додано модульне вікно налаштувань | added settings modal

[UA]
- Створено SettingsContext для збереження обраної мови у localStorage.
- Додано компонент SettingsModal для вибору мови (English/Українська).
- Інтегровано i18n переклади у компонент Sidebar.

[EN]
- Created SettingsContext to persist selected language in localStorage.
- Added SettingsModal component for language selection (English/Ukrainian).
- Integrated i18n translations into the Sidebar component.
```
