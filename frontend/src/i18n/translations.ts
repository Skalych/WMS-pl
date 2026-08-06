export const translations = {
  en: {
    sidebar: {
      operations: 'OPERATIONS',
      dashboard: 'Dashboard',
      employees: 'Employees',
      inventory: 'Inventory',
      ordersWaves: 'Orders & Waves',
      reports: 'REPORTS',
      shiftReports: 'Shift Reports',
      analytics: 'Analytics',
      settings: 'Settings',
      connected: 'Connected',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      languageEn: 'English',
      languageUk: 'Українська',
      save: 'Save Changes',
      cancel: 'Cancel',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Warehouse operations overview'
    }
  },
  uk: {
    sidebar: {
      operations: 'ОПЕРАЦІЇ',
      dashboard: 'Дашборд',
      employees: 'Працівники',
      inventory: 'Склад',
      ordersWaves: 'Замовлення та Хвилі',
      reports: 'ЗВІТИ',
      shiftReports: 'Звіти змін',
      analytics: 'Аналітика',
      settings: 'Налаштування',
      connected: 'Підключено',
    },
    settings: {
      title: 'Налаштування',
      language: 'Мова',
      languageEn: 'English',
      languageUk: 'Українська',
      save: 'Зберегти зміни',
      cancel: 'Скасувати',
    },
    dashboard: {
      title: 'Дашборд',
      subtitle: 'Огляд складських операцій'
    }
  }
};

export type Language = 'en' | 'uk';
export type TranslationKey = keyof typeof translations.en;
