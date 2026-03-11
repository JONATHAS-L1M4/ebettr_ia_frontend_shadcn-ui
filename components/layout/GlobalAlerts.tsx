import React, { useEffect, useState } from 'react';
import {
  Alert as UiAlert,
  AlertDescription,
  AlertTitle,
} from '../ui/Alert';
import { Button } from '../ui/button';
import { cn } from '../../utils/cn';
import { Alert as SystemAlert } from '../../types';
import { alertService } from '../../services/alertService';
import {
  X,
  Info,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface GlobalAlertsProps {
  userRole: string;
}

type AlertTone = {
  container: string;
  iconWrap: string;
  icon: React.ReactNode;
};

const readHiddenAlerts = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('hiddenAlerts') || '[]');
  } catch {
    return [];
  }
};

const getAlertStyles = (level: string): AlertTone => {
  switch (level) {
    case 'critical':
      return {
        container: 'border-destructive/50 bg-card/95',
        iconWrap: 'bg-destructive/20 text-destructive',
        icon: <ShieldAlert className="h-4 w-4" />,
      };
    case 'error':
      return {
        container: 'border-destructive/30 bg-card/95',
        iconWrap: 'bg-destructive/15 text-destructive',
        icon: <AlertCircle className="h-4 w-4" />,
      };
    case 'warning':
      return {
        container: 'border-border bg-card/95',
        iconWrap: 'bg-muted text-foreground',
        icon: <AlertTriangle className="h-4 w-4" />,
      };
    case 'info':
    default:
      return {
        container: 'border-border bg-card/95',
        iconWrap: 'bg-muted text-muted-foreground',
        icon: <Info className="h-4 w-4" />,
      };
  }
};

export const GlobalAlerts: React.FC<GlobalAlertsProps> = ({ userRole }) => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [expanded, setExpanded] = useState(false);
  const { addNotification } = useNotification();

  const isAdmin = userRole === 'admin';

  const fetchAlerts = async () => {
    try {
      const data = await alertService.list();
      const hiddenAlerts = readHiddenAlerts();
      const visible = data.filter(
        (alert: SystemAlert) => !hiddenAlerts.includes(alert.id)
      );
      const sorted = [...visible].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAlerts(sorted);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await alertService.delete(id);
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
      addNotification(
        'success',
        'Alerta removido',
        'O alerta foi removido do sistema.'
      );
    } catch (error) {
      console.error('Failed to delete alert:', error);
      addNotification('error', 'Erro', 'Nao foi possivel remover o alerta.');
    }
  };

  const handleHide = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));

    const hiddenAlerts = readHiddenAlerts();
    if (!hiddenAlerts.includes(id)) {
      hiddenAlerts.push(id);
      localStorage.setItem('hiddenAlerts', JSON.stringify(hiddenAlerts));
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  const visibleAlerts = expanded ? alerts : alerts.slice(0, 1);

  return (
    <div className="z-50 flex w-full flex-col gap-2">
      {visibleAlerts.map((alert) => {
        const styles = getAlertStyles(alert.level);

        return (
          <UiAlert
            key={alert.id}
            className={cn(
              'rounded-xl border px-3 py-2 text-foreground shadow-none md:px-4 md:py-3',
              styles.container
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    styles.iconWrap
                  )}
                >
                  {styles.icon}
                </div>

                <div className="min-w-0">
                  <AlertTitle className="pr-0 text-sm text-foreground">
                    {alert.title}
                  </AlertTitle>
                  <AlertDescription className="mt-0.5 text-xs text-muted-foreground">
                    {alert.message}
                  </AlertDescription>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleHide(alert.id)}
                  className="h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Ocultar alerta"
                  aria-label="Ocultar alerta"
                >
                  <X className="h-4 w-4" />
                </Button>

                {isAdmin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(alert.id)}
                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    title="Excluir do sistema"
                    aria-label="Excluir alerta do sistema"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </UiAlert>
        );
      })}

      {alerts.length > 1 && (
        <div className="flex justify-center rounded-lg border border-border bg-card">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((prev) => !prev)}
              className="h-10 gap-2 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Mostrar apenas o mais recente
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Mostrar mais {alerts.length - 1} alerta(s)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
