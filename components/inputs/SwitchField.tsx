import React from 'react';
import { ConfigField } from '../../types';
import Toggle from '../ui/Toggle';

interface SwitchFieldProps {
  field: ConfigField;
  onChange: (checked: boolean) => void;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({ field, onChange }) => (
  <div className="flex items-center justify-between px-1 py-2">
    <span className="text-xs font-medium text-muted-foreground">{field.value ? 'Ativo' : 'Inativo'}</span>
    <Toggle checked={field.value as boolean} onChange={onChange} size="sm" />
  </div>
);
