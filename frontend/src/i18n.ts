import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  en: {
    translation: {
      sidebar: {
        operations: "OPERATIONS",
        dashboard: "Dashboard",
        employees: "Employees",
        inventory: "Inventory",
        ordersWaves: "Orders & Waves",
        reports: "REPORTS",
        shiftReports: "Shift Reports",
        analytics: "Analytics",
        settings: "Settings",
        connected: "Connected"
      }
    }
  },
  uk: {
    translation: {
      sidebar: {
        operations: "ОПЕРАЦІЇ",
        dashboard: "Дашборд",
        employees: "Працівники",
        inventory: "Інвентар",
        ordersWaves: "Orders & Waves", // Logistics terms in English
        reports: "ЗВІТИ",
        shiftReports: "Shift Reports",
        analytics: "Аналітика",
        settings: "Налаштування",
        connected: "Підключено"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
