import React, { useEffect, useState } from 'react';
import { ConfigField } from '../../types';
import { inputBaseClass } from './styles';
import { Link, AlertCircle } from '../ui/Icons';

interface UrlFieldProps {
  field: ConfigField;
  onChange: (value: string) => void;
}

export const UrlField: React.FC<UrlFieldProps> = ({ field, onChange }) => {
  const [error, setError] = useState('');
  const value = field.value as string;

  useEffect(() => {
    if (value && !value.includes('://')) {
      setError('A URL deve conter o protocolo (ex: https://)');
    } else {
      setError('');
    }
  }, [value]);

  return (
    <div className="space-y-1">
      <div className="group relative">
        <div className="absolute left-3 top-2.5 text-muted-foreground transition-colors group-focus-within:text-foreground">
          <Link className="h-4 w-4" />
        </div>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'https://exemplo.com'}
          className={`${inputBaseClass} pl-10 ${error ? 'border-destructive/40 focus-visible:border-destructive focus-visible:ring-destructive' : ''}`}
        />
      </div>

      {error && (
        <div className="flex items-center gap-1 text-[10px] text-destructive animate-fade-in">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
