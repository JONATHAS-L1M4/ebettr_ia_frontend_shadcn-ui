import React from 'react';
import { ConfigField } from '../../types';

interface CheckboxFieldProps {
  field: ConfigField;
  onChange: (checked: boolean) => void;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({ field, onChange }) => (
  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card p-2 transition-all hover:border-ring/50">
    <input
      type="checkbox"
      checked={field.value as boolean}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-input bg-background text-primary accent-primary focus:ring-ring"
    />
    <span className="text-sm text-foreground">{field.placeholder || 'Ativar opcao'}</span>
  </label>
);
