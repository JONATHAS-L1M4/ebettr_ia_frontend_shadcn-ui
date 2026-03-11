import React, { useEffect, useState } from 'react';
import { ConfigField } from '../../types';
import { inputBaseClass } from './styles';
import { Link, Copy, CheckCircle2 } from '../ui/Icons';
import { useNotification } from '../../context/NotificationContext';

interface UuidFieldProps {
  field: ConfigField;
  onChange: (value: string) => void;
}

export const UuidField: React.FC<UuidFieldProps> = ({ field, onChange }) => {
  const { addNotification } = useNotification();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!field.value && field.baseUrl) {
      onChange(field.baseUrl);
    }
  }, []);

  const displayValue = String(field.value || '');

  const handleCopy = () => {
    navigator.clipboard.writeText(displayValue);
    setCopied(true);
    addNotification('success', 'Link copiado', 'URL do webhook copiada para a area de transferencia.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <div className="absolute left-3 top-2.5 text-muted-foreground">
          <Link className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={displayValue}
          readOnly
          className={`${inputBaseClass} cursor-pointer select-all bg-muted/30 pl-9 pr-12 font-mono text-xs text-muted-foreground shadow-inner focus-visible:ring-0 focus-visible:ring-offset-0`}
          placeholder="Link do webhook..."
          onClick={handleCopy}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-2 top-1.5 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Copiar link"
        >
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};
