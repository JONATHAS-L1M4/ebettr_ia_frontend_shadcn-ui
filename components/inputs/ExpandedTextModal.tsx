import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X, Check, Copy } from '../ui/Icons';
import { useNotification } from '../../context/NotificationContext';

interface ExpandedTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  label: string;
  value: string;
  maxLength?: number;
}

export const ExpandedTextModal: React.FC<ExpandedTextModalProps> = ({
  isOpen, onClose, onSave, label, value, maxLength
}) => {
  const { addNotification } = useNotification();
  const [localValue, setLocalValue] = useState(value);

  // Sincroniza o valor local quando o modal abre ou o valor muda externamente
  useEffect(() => {
    setLocalValue(value);
  }, [value, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(localValue);
    addNotification('success', 'Copiado', 'Texto copiado para a área de transferência.');
  };

  const currentLength = localValue.length;

  const content = (
    <div className="fixed inset-0 z-[9999] flex animate-fade-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-3xl animate-scale-in flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/35 px-6 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
            <Maximize2 className="w-4 h-4" />
            Editando: {label}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 flex flex-col gap-2 min-h-0">
           <textarea
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              maxLength={maxLength}
              className="w-full flex-1 resize-none rounded-lg border border-border bg-background p-5 text-sm leading-relaxed text-foreground shadow-inner outline-none placeholder:text-muted-foreground"
              placeholder="Digite seu texto aqui..."
              autoFocus
           />
           <div className="flex justify-between items-center shrink-0 pt-2">
              <div className="flex gap-2">
                  <button onClick={handleCopy} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                      <Copy className="w-3 h-3" /> Copiar
                  </button>
              </div>
              <span className={`text-xs font-mono transition-colors ${
                  maxLength && currentLength >= maxLength ? 'font-bold text-destructive' : 'text-muted-foreground'
              }`}>
                  {currentLength}{maxLength ? `/${maxLength}` : ''}
              </span>
           </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-muted/35 px-6 py-4">
          <button 
            onClick={onClose}
            className="flex h-10 items-center justify-center rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(localValue)}
            className="flex h-10 items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md text-xs font-bold hover:bg-primary/90 transition-all uppercase tracking-wide"
          >
            <Check className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
