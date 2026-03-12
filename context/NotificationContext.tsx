import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '../components/ui/Alert';
import { cn } from '../utils/cn';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from '../components/ui/Icons';
import { darkTheme } from '../design-tokens';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
}

interface NotificationContextData {
  addNotification: (
    type: NotificationType,
    title: string,
    message?: string
  ) => void;
  removeNotification: (id: string) => void;
}

const fixMojibake = (text: string) => {
  if (!/[ÃÂ]/.test(text)) {
    return text;
  }

  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0));
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return decoded.includes('\uFFFD') ? text : decoded;
  } catch {
    return text;
  }
};

const portugueseReplacements: Array<[RegExp, string]> = [
  [/\bNao\b/g, 'Não'],
  [/\bnao\b/g, 'não'],
  [/\bJa\b/g, 'Já'],
  [/\bja\b/g, 'já'],
  [/\bEsta\b/g, 'Está'],
  [/\besta\b/g, 'está'],
  [/\bEstao\b/g, 'Estão'],
  [/\bestao\b/g, 'estão'],
  [/\bCodigo\b/g, 'Código'],
  [/\bcodigo\b/g, 'código'],
  [/\bInvalido\b/g, 'Inválido'],
  [/\binvalido\b/g, 'inválido'],
  [/\bObrigatorios\b/g, 'Obrigatórios'],
  [/\bobrigatorios\b/g, 'obrigatórios'],
  [/\bConfiguracao\b/g, 'Configuração'],
  [/\bconfiguracao\b/g, 'configuração'],
  [/\bConfiguracoes\b/g, 'Configurações'],
  [/\bconfiguracoes\b/g, 'configurações'],
  [/\bConexao\b/g, 'Conexão'],
  [/\bconexao\b/g, 'conexão'],
  [/\bPossivel\b/g, 'Possível'],
  [/\bpossivel\b/g, 'possível'],
  [/\bSincronizacao\b/g, 'Sincronização'],
  [/\bsincronizacao\b/g, 'sincronização'],
  [/\bAlteracoes\b/g, 'Alterações'],
  [/\balteracoes\b/g, 'alterações'],
  [/\bConcluido\b/g, 'Concluído'],
  [/\bconcluido\b/g, 'concluído'],
  [/\bConcluida\b/g, 'Concluída'],
  [/\bconcluida\b/g, 'concluída'],
  [/\bExcluido\b/g, 'Excluído'],
  [/\bexcluido\b/g, 'excluído'],
  [/\bModulo\b/g, 'Módulo'],
  [/\bmodulo\b/g, 'módulo'],
  [/\bRecuperacao\b/g, 'Recuperação'],
  [/\brecuperacao\b/g, 'recuperação'],
  [/Area de transferencia/g, 'Área de transferência'],
  [/area de transferencia/g, 'área de transferência'],
];

const normalizeNotificationText = (text?: string) => {
  if (!text) {
    return undefined;
  }

  return portugueseReplacements.reduce(
    (currentText, [pattern, replacement]) =>
      currentText.replace(pattern, replacement),
    fixMojibake(text).trim()
  );
};

const NotificationContext = createContext<NotificationContextData | null>(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const NotificationItem: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  const toneMap: Record<
    NotificationType,
    { icon: React.ComponentType<{ className?: string }>; iconClassName: string; alertClassName: string }
  > = {
    success: {
      icon: CheckCircle2,
      iconClassName: 'text-foreground',
      alertClassName: 'border-border bg-card text-foreground',
    },
    error: {
      icon: AlertCircle,
      iconClassName: 'text-destructive',
      alertClassName: 'border-border bg-card text-foreground',
    },
    warning: {
      icon: AlertTriangle,
      iconClassName: 'text-foreground',
      alertClassName: 'border-border bg-card text-foreground',
    },
    info: {
      icon: Info,
      iconClassName: 'text-muted-foreground',
      alertClassName: 'border-border bg-card text-foreground',
    },
  };

  const currentTone = toneMap[notification.type];
  const Icon = currentTone.icon;
  const normalizedTitle = normalizeNotificationText(notification.title) ?? notification.title;
  const normalizedMessage = normalizeNotificationText(notification.message);

  return (
    <Alert
      className={cn(
        'animate-scale-in rounded-lg p-3 pr-8 shadow-lg [&>svg~*]:pl-6 [&>svg+div]:translate-y-0 [&>svg]:left-3 [&>svg]:top-3',
        currentTone.alertClassName
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', currentTone.iconClassName)} />
      <AlertTitle className="pr-3 text-sm leading-tight">{normalizedTitle}</AlertTitle>
      {normalizedMessage && (
        <AlertDescription className="pr-3 text-[11px] leading-4 text-muted-foreground">
          {normalizedMessage}
        </AlertDescription>
      )}
      <AlertAction className="right-2.5 top-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-sm bg-transparent p-0 text-muted-foreground/70 transition hover:bg-transparent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Fechar notificação"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </AlertAction>
    </Alert>
  );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const portalThemeStyle = {
    ...(darkTheme as React.CSSProperties),
    colorScheme: 'dark' as const,
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const addNotification = useCallback(
    (type: NotificationType, title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      setNotifications((prev) => {
        const next = [...prev, { id, type, title, message }];
        return next.slice(-5);
      });
    },
    []
  );

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      {isMounted &&
        createPortal(
          <div
            className="dark pointer-events-none fixed inset-x-4 bottom-3 z-[2147483647] flex flex-col gap-2 font-sans sm:left-auto sm:right-4 sm:w-full sm:max-w-xs"
            style={portalThemeStyle}
            aria-live="polite"
            aria-atomic="true"
          >
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="pointer-events-auto animate-fade-in"
              >
                <NotificationItem
                  notification={notification}
                  onClose={() => removeNotification(notification.id)}
                />
              </div>
            ))}
          </div>,
          document.body
        )}
    </NotificationContext.Provider>
  );
};
