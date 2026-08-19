import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Language } from '../i18n/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t } = useSettings();
  const [localLang, setLocalLang] = useState<Language>(language);

  useEffect(() => {
    if (isOpen) {
      setLocalLang(language);
    }
  }, [isOpen, language]);

  if (!isOpen) return null;

  const handleSave = () => {
    setLanguage(localLang);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content--compact">
        <div className="modal-header">
          <h2 className="data-panel-title">{t('settings', 'title')}</h2>
        </div>

        <div className="settings-modal-body">
          <label className="form-label" htmlFor="settings-language">
            {t('settings', 'language')}
          </label>
          <select
            id="settings-language"
            className="select-field"
            value={localLang}
            onChange={(e) => setLocalLang(e.target.value as Language)}
          >
            <option value="en">{t('settings', 'languageEn')}</option>
            <option value="uk">{t('settings', 'languageUk')}</option>
          </select>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('settings', 'cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {t('settings', 'save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
