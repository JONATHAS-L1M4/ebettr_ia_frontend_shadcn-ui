import React, { useEffect, useState } from 'react';
import { Alert } from '../../types';
import { alertService } from '../../services/alertService';
import {
  X,
  Info,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const GlobalAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expanded, setExpanded] = useState(false);

  const fetchAlerts = async () => {
    try {
      const data = await alertService.list();

      const hiddenAlerts = JSON.parse(
        localStorage.getItem('hiddenAlerts') || '[]'
      );

      const filtered = data.filter(
        (alert: Alert) => !hiddenAlerts.includes(alert.id)
      );

      setAlerts(filtered);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleHide = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));

    const hiddenAlerts = JSON.parse(
      localStorage.getItem('hiddenAlerts') || '[]'
    );

    if (!hiddenAlerts.includes(id)) {
      hiddenAlerts.push(id);
      localStorage.setItem('hiddenAlerts', JSON.stringify(hiddenAlerts));
    }
  };

  if (alerts.length === 0) return null;

  const visibleAlerts = expanded ? alerts : alerts.slice(0, 1);

  const getAlertStyles = (level: string) => {
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-red-600',
          text: 'text-white',
          icon: <ShieldAlert className="h-5 w-5" />,
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          text: 'text-white',
          icon: <AlertCircle className="h-5 w-5" />,
        };
      case 'warning':
        return {
          bg: 'bg-amber-500',
          text: 'text-white',
          icon: <AlertTriangle className="h-5 w-5" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          icon: <Info className="h-5 w-5" />,
        };
    }
  };

  return (
    <div className="z-50 flex w-full flex-col">
      {visibleAlerts.map((alert) => {
        const styles = getAlertStyles(alert.level);

        return (
          <div
            key={alert.id}
            className={`${styles.bg} ${styles.text} flex items-start justify-between px-4 py-3 shadow-sm sm:items-center`}
          >
            <div className="flex items-start gap-3 sm:items-center">
              <div className="mt-0.5 shrink-0 sm:mt-0">{styles.icon}</div>

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <strong className="text-sm font-bold tracking-wide">
                  {alert.title}
                </strong>

                <span className="hidden text-xs opacity-50 sm:inline">|</span>

                <span className="text-sm opacity-90">{alert.message}</span>
              </div>
            </div>

            <div className="ml-4 flex items-center gap-2">
              <button
                onClick={() => handleHide(alert.id)}
                className="rounded-md p-1.5 transition-colors hover:bg-black/10"
                title="Ocultar alerta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      {alerts.length > 1 && (
        <div className="flex justify-center border-t border-neutral-800 bg-neutral-900">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 px-4 py-2 text-xs text-neutral-200 transition hover:bg-white/5 hover:text-white"
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
          </button>
        </div>
      )}
    </div>
  );
};
