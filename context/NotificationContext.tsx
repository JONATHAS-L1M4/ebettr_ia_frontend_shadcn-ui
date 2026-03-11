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
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from '../components/ui/Icons';

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
    { icon: React.ReactNode; iconClassName: string }
  > = {
    success: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      iconClassName:
        'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    },
    error: {
      icon: <AlertCircle className="h-4 w-4" />,
      iconClassName:
        'border border-destructive/20 bg-destructive/10 text-destructive',
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4" />,
      iconClassName: 'border border-amber-500/20 bg-amber-500/10 text-amber-300',
    },
    info: {
      icon: <Info className="h-4 w-4" />,
      iconClassName: 'border border-border bg-muted/60 text-foreground',
    },
  };

  const currentTone = toneMap[notification.type];

  return (
    <Alert className="animate-scale-in">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${currentTone.iconClassName}`}
        >
          {currentTone.icon}
        </div>
        <div className="min-w-0">
          <AlertTitle>{notification.title}</AlertTitle>
          {notification.message && (
            <AlertDescription className="mt-1">
              {notification.message}
            </AlertDescription>
          )}
        </div>
      </div>
      <AlertAction>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Fechar notificacao"
        >
          <X className="h-4 w-4" />
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
            className="pointer-events-none fixed inset-x-4 bottom-4 z-[2147483647] flex flex-col gap-3 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
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
