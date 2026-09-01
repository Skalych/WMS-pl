import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { authService } from '../api/services';
import { UserRole } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REGISTER_ROLES: UserRole[] = [
  UserRole.PICKER,
  UserRole.INBOUND_OPERATOR,
  UserRole.PACKER_DISPATCHER,
  UserRole.ADMIN_MANAGER,
];

function extractErrorDetail(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: { detail?: unknown } } };
  const detail = axiosErr.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : ''))
      .filter(Boolean);
    return messages.length > 0 ? messages.join(', ') : fallback;
  }
  return fallback;
}

export default function RegisterUserModal({ isOpen, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PICKER);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole(UserRole.PICKER);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError(t('registerUser.errorNameRequired'));
      return;
    }
    if (!trimmedEmail) {
      setError(t('registerUser.errorEmailRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('registerUser.errorPasswordShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('registerUser.errorPasswordMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.register(trimmedEmail, password, trimmedName, role);
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(extractErrorDetail(err, t('registerUser.errorGeneric')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content modal-content--compact"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="register-user-title"
      >
        <div className="modal-header">
          <h2 id="register-user-title" className="data-panel-title">
            {t('registerUser.title')}
          </h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={handleClose} aria-label={t('common.cancel')}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="settings-modal-body">
            <p className="text-muted" style={{ marginBottom: 16 }}>
              {t('registerUser.subtitle')}
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-field">
              <label className="form-label" htmlFor="register-full-name">
                {t('registerUser.fullName')}
              </label>
              <input
                id="register-full-name"
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('registerUser.fullNamePlaceholder')}
                autoComplete="name"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="register-email">
                {t('registerUser.email')}
              </label>
              <input
                id="register-email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@wms.local"
                autoComplete="off"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label" htmlFor="register-password">
                  {t('registerUser.password')}
                </label>
                <input
                  id="register-password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="register-confirm-password">
                  {t('registerUser.confirmPassword')}
                </label>
                <input
                  id="register-confirm-password"
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="register-role">
                {t('registerUser.role')}
              </label>
              <select
                id="register-role"
                className="select-field"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSubmitting}
              >
                {REGISTER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`registerUser.roles.${r}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? t('registerUser.submitting') : t('registerUser.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
