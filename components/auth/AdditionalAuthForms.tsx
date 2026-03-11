import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from '../ui/Icons';
import { useNotification } from '../../context/NotificationContext';
import { authService } from '../../services/authService';
import {
  authFieldClass,
  authFooterClass,
  authInlineLinkClass,
  authInputIconClass,
  authInputWithBothIconsClass,
  authInputWithLeadingIconClass,
  authLabelClass,
  authOtpInputClass,
  authPrimaryButtonClass,
  authSectionCardClass,
  cn,
} from './authStyles';

type AuthIcon = React.ComponentType<{ className?: string }>;

interface TextFieldProps {
  id: string;
  label: string;
  icon: AuthIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  trailingAction?: React.ReactNode;
}

const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  trailingAction,
}) => (
  <div className={authFieldClass}>
    <label htmlFor={id} className={authLabelClass}>
      {label}
    </label>
    <div className="group relative">
      <Icon className={authInputIconClass} />
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          trailingAction ? authInputWithBothIconsClass : authInputWithLeadingIconClass
        )}
        required
      />
      {trailingAction}
    </div>
  </div>
);

interface SignupFormProps {
  onSuccess: (email: string) => void;
  onLogin: () => void;
  onError: (msg: string) => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onSuccess,
  onLogin,
  onError,
}) => {
  const { addNotification } = useNotification();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onError('');

    if (formData.password !== formData.confirm) {
      const message = 'As senhas nao coincidem.';
      onError(message);
      addNotification('error', 'Erro no Cadastro', message);
      return;
    }

    if (formData.password.length < 6) {
      const message = 'A senha deve ter pelo menos 6 caracteres.';
      onError(message);
      addNotification('error', 'Senha Fraca', message);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess(formData.email);
    }, 1500);
  };

  return (
    <div className={authSectionCardClass}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="signup-name"
          label="Nome completo"
          icon={User}
          value={formData.name}
          onChange={(value) => setFormData((current) => ({ ...current, name: value }))}
          placeholder="Seu nome"
        />

        <TextField
          id="signup-email"
          label="Email"
          icon={Mail}
          value={formData.email}
          onChange={(value) => setFormData((current) => ({ ...current, email: value }))}
          placeholder="voce@empresa.com"
          type="email"
        />

        <TextField
          id="signup-phone"
          label="Telefone"
          icon={Phone}
          value={formData.phone}
          onChange={(value) => setFormData((current) => ({ ...current, phone: value }))}
          placeholder="(11) 99999-9999"
          type="tel"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="signup-password"
            label="Senha"
            icon={Lock}
            value={formData.password}
            onChange={(value) =>
              setFormData((current) => ({ ...current, password: value }))
            }
            placeholder="Crie uma senha"
            type={showPassword ? 'text' : 'password'}
            trailingAction={
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -mt-0.5 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />

          <TextField
            id="signup-confirm"
            label="Confirmar"
            icon={Lock}
            value={formData.confirm}
            onChange={(value) =>
              setFormData((current) => ({ ...current, confirm: value }))
            }
            placeholder="Repita a senha"
            type={showConfirmPassword ? 'text' : 'password'}
            trailingAction={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute right-3 top-1/2 -mt-0.5 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={
                  showConfirmPassword ? 'Ocultar confirmacao' : 'Mostrar confirmacao'
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={authPrimaryButtonClass}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            'Criar conta'
          )}
        </button>
      </form>

      <div className={authFooterClass}>
        Ja tem uma conta?{' '}
        <button type="button" onClick={onLogin} className={authInlineLinkClass}>
          Voltar para o login
        </button>
      </div>
    </div>
  );
};

interface RecoveryFormProps {
  onSuccess: (email: string) => void;
  onCancel: () => void;
}

export const RecoveryForm: React.FC<RecoveryFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { addNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      await authService.requestPasswordReset(email);
      onSuccess(email);
    } catch (err: any) {
      addNotification('error', 'Erro', err.message || 'Falha ao solicitar recuperacao.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={authSectionCardClass}>
      <button
        type="button"
        onClick={onCancel}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao login
      </button>

      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          id="recovery-email"
          label="Email"
          icon={Mail}
          value={email}
          onChange={setEmail}
          placeholder="voce@empresa.com"
          type="email"
        />

        <button
          type="submit"
          disabled={isSending}
          className={authPrimaryButtonClass}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar'
          )}
        </button>
      </form>
    </div>
  );
};

interface RecoveryCodeFormProps {
  email: string;
  onSuccess: (resetToken: string) => void;
  onCancel: () => void;
}

export const RecoveryCodeForm: React.FC<RecoveryCodeFormProps> = ({
  email,
  onSuccess,
  onCancel,
}) => {
  const { addNotification } = useNotification();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRefs.current[0]?.focus(), 100);
    return () => clearTimeout(focusTimer);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;

    if (val === '') {
      const chars = code.split('');
      chars[index] = '';
      setCode(chars.join(''));
      return;
    }

    if (!/^[0-9a-zA-Z]$/.test(val.slice(-1))) return;

    const chars = code.split('');
    for (let i = 0; i < 6; i += 1) {
      if (!chars[i]) chars[i] = '';
    }

    chars[index] = val.slice(-1).toUpperCase();
    const nextCode = chars.join('').slice(0, 6);
    setCode(nextCode);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/[^0-9a-zA-Z]/g, '')
      .slice(0, 6)
      .toUpperCase();

    if (!pastedData) return;

    setCode(pastedData);
    inputRefs.current[Math.min(pastedData.length - 1, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setIsVerifying(true);
    try {
      const resetToken = await authService.verifyResetCode(email, code);
      onSuccess(resetToken);
    } catch (error: any) {
      addNotification('error', 'Codigo Invalido', 'O codigo digitado esta incorreto ou expirou.');
      setCode('');
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={cn(authSectionCardClass, 'animate-scale-in')}>
      <button
        type="button"
        onClick={onCancel}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Cancelar
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              maxLength={1}
              value={code[index] || ''}
              onChange={(e) => handleInput(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              className={authOtpInputClass}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={isVerifying || code.length !== 6}
          className={authPrimaryButtonClass}
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando...
            </>
          ) : (
            'Continuar'
          )}
        </button>
      </form>
    </div>
  );
};

interface ResetPasswordFormProps {
  email: string;
  resetToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  email,
  resetToken,
  onSuccess,
  onCancel,
}) => {
  const { addNotification } = useNotification();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validations = [
    { id: 'len', label: 'Minimo de 8 caracteres', test: (value: string) => value.length >= 8 },
    { id: 'upper', label: 'Uma letra maiuscula', test: (value: string) => /[A-Z]/.test(value) },
    { id: 'lower', label: 'Uma letra minuscula', test: (value: string) => /[a-z]/.test(value) },
    { id: 'num', label: 'Um numero', test: (value: string) => /[0-9]/.test(value) },
    { id: 'spec', label: 'Um simbolo', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  ];

  const passedCount = validations.reduce(
    (accumulator, rule) => accumulator + (rule.test(password) ? 1 : 0),
    0
  );
  const strengthPercentage = Math.min((passedCount / validations.length) * 100, 100);
  const allValid = passedCount === validations.length;

  let strengthColor = 'bg-muted';
  let strengthLabel = 'Aguardando';

  if (password.length > 0) {
    if (passedCount <= 2) {
      strengthColor = 'bg-muted-foreground/35';
      strengthLabel = 'Fraca';
    } else if (passedCount <= 4) {
      strengthColor = 'bg-muted-foreground/55';
      strengthLabel = 'Media';
    } else {
      strengthColor = 'bg-foreground/70';
      strengthLabel = 'Forte';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      addNotification('error', 'Erro', 'As senhas nao coincidem.');
      return;
    }

    if (!allValid) {
      addNotification(
        'error',
        'Senha Fraca',
        'Sua senha nao atende aos requisitos de seguranca.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await authService.completePasswordReset(email, resetToken, password);
      onSuccess();
    } catch (error: any) {
      addNotification(
        'error',
        'Erro ao Redefinir',
        error.message || 'Falha ao redefinir a senha.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={authSectionCardClass}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          id="reset-password"
          label="Nova senha"
          icon={Lock}
          value={password}
          onChange={setPassword}
          placeholder="Digite a nova senha"
          type={showPassword ? 'text' : 'password'}
          trailingAction={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -mt-0.5 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        <TextField
          id="reset-confirm"
          label="Confirmar senha"
          icon={Lock}
          value={confirm}
          onChange={setConfirm}
          placeholder="Repita a nova senha"
          type={showConfirmPassword ? 'text' : 'password'}
          trailingAction={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-3 top-1/2 -mt-0.5 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              aria-label={
                showConfirmPassword ? 'Ocultar confirmacao' : 'Mostrar confirmacao'
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Forca da senha
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground">
              {strengthLabel}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-300', strengthColor)}
              style={{ width: `${strengthPercentage}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Use pelo menos 8 caracteres com letras, numero e simbolo.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !allValid}
          className={authPrimaryButtonClass}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar senha'
          )}
        </button>
      </form>

      <div className={authFooterClass}>
        <button type="button" onClick={onCancel} className={authInlineLinkClass}>
          Cancelar e voltar ao login
        </button>
      </div>
    </div>
  );
};
