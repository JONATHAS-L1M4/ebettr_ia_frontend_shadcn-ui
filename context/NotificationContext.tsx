
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from '../components/ui/Icons';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
}

interface NotificationContextData {
  addNotification: (type: NotificationType, title: string, message?: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const addNotification = useCallback((type: NotificationType, title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newNotification = { id, type, title, message };
    
    setNotifications((prev) => [...prev, newNotification]);
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      
      {/* Toast Container - Responsive Positioning */}
      <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:right-6 md:left-auto z-[9999] flex flex-col gap-3 md:w-full md:max-w-[360px] pointer-events-none">
        {notifications.map((notification) => (
          <Toast 
            key={notification.id} 
            notification={notification} 
            onClose={() => removeNotification(notification.id)} 
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Componente Visual do Toast Minimalista com Ícones Coloridos
const Toast: React.FC<{ notification: Notification; onClose: () => void }> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="pointer-events-auto bg-white border border-gray-200 shadow-xl shadow-gray-200/50 rounded-lg p-4 flex items-start gap-4 animate-fade-in group hover:border-gray-300 transition-all duration-200 w-full">
      <div className="mt-0.5 shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 leading-tight tracking-tight">{notification.title}</h4>
        {notification.message && (
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed font-light">{notification.message}</p>
        )}
      </div>
      <button 
        onClick={onClose}
        className="text-gray-300 hover:text-black transition-colors shrink-0 p-0.5 rounded-md hover:bg-gray-50"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};