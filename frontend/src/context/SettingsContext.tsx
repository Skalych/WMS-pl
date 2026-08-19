import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations } from '../i18n/translations';
import i18n from '../i18n';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (section: keyof typeof translations.en, key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('wms-language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'uk')) {
      setLanguageState(savedLang);
      i18n.changeLanguage(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('wms-language', lang);
    i18n.changeLanguage(lang);
  };

  const t = (section: keyof typeof translations.en, key: string): string => {
    try {
      // @ts-ignore
      return translations[language][section][key] || translations['en'][section][key] || key;
    } catch (e) {
      return key;
    }
  };

  return (
    <SettingsContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
