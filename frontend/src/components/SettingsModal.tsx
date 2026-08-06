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

  // Reset local state when modal opens
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
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content data-panel glow" style={modalStyle}>
        <div className="data-panel-header" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="data-panel-title">{t('settings', 'title')}</h2>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t('settings', 'language')}
            </label>
            <select 
              className="select-field input-field" 
              style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' }}
              value={localLang}
              onChange={(e) => setLocalLang(e.target.value as Language)}
            >
              <option value="en" style={{ background: 'var(--bg-primary)' }}>{t('settings', 'languageEn')}</option>
              <option value="uk" style={{ background: 'var(--bg-primary)' }}>{t('settings', 'languageUk')}</option>
            </select>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px', 
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}>
          <button className="btn btn-ghost" onClick={onClose}>
            {t('settings', 'cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {t('settings', 'save')}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '400px',
  borderRadius: '12px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(227, 89, 172, 0.1)',
};

export default SettingsModal;
