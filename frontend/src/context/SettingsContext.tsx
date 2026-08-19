import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n, { Language } from '../i18n';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** @deprecated Use useTranslation() from react-i18next instead */
  t: (section: string, key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>((i18n.language as Language) || 'en');

  useEffect(() => {
    const onLanguageChanged = (lng: string) => {
      if (lng === 'en' || lng === 'uk') {
        setLanguageState(lng);
      }
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => {
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('wms-language', lang);
    i18n.changeLanguage(lang);
  };

  const t = (section: string, key: string): string => i18n.t(`${section}.${key}`);

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

export type { Language };
