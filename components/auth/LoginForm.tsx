import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail } from '../ui/Icons';
import { authService, AuthResponse } from '../../services/authService';
import { useNotification } from '../../context/NotificationContext';
import {
  authFieldClass,
  authFooterClass,
  authInlineLinkClass,
  authInputIconClass,
  authInputWithBothIconsClass,
  authInputWithLeadingIconClass,
  authLabelClass,
  authPrimaryButtonClass,
  authSectionCardClass,
} from './authStyles';

interface LoginFormProps {
  onSuccess: (
    email: string,
    role: 'admin' | 'client' | 'support',
    authData: AuthResponse
  ) => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
  onError: (msg: string) => void;
  showSignUp: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  onSignUp,
  onError,
  showSignUp,
}) => {
  const { addNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError('');
    setIsLoading(true);

    try {
      const initialCsrf = await authService.getLoginCsrf();
      const authData = await authService.login(email, password, initialCsrf);

      let role: 'admin' | 'client' | 'support' = 'client';
      if (email.toLowerCase().includes('admin')) role = 'admin';
      else if (email.toLowerCase().includes('suporte')) role = 'support';

      onSuccess(email, role, authData);
    } catch (err: any) {
      const errorMessage = err.message || 'Email ou senha incorretos.';
      onError(errorMessage);
      addNotification('error', 'Falha no Login', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={authSectionCardClass}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={authFieldClass}>
          <label htmlFor="login-email" className={authLabelClass}>
            Email
          </label>
          <div className="group relative">
            <Mail className={authInputIconClass} />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className={authInputWithLeadingIconClass}
              required
            />
          </div>
        </div>

        <div className={authFieldClass}>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="login-password" className={authLabelClass}>
              Senha
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className={authInlineLinkClass}
            >
              Esqueci minha senha
            </button>
          </div>

          <div className="group relative">
            <Lock className={authInputIconClass} />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className={authInputWithBothIconsClass}
              required
            />
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
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={authPrimaryButtonClass}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </button>
      </form>

      {showSignUp && (
        <div className={authFooterClass}>
          Nao tem uma conta?{' '}
          <button
            type="button"
            onClick={onSignUp}
            className="font-medium text-foreground underline-offset-4 transition hover:underline"
          >
            Criar cadastro
          </button>
        </div>
      )}
    </div>
  );
};
