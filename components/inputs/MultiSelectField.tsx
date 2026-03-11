import React from 'react';
import { ConfigField, SelectOption } from '../../types';

interface MultiSelectFieldProps {
  field: ConfigField;
  onChange: (option: string, isMulti: boolean) => void;
}

export const MultiSelectField: React.FC<MultiSelectFieldProps> = ({ field, onChange }) => {
  const options: SelectOption[] = (field.options || []).map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  return (
    <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-muted/30 p-2">
      {options.map((opt) => {
        const valStr = String(opt.value);
        const isSelected = (field.value as string[]).includes(valStr);

        return (
          <label key={valStr} className="flex cursor-pointer items-center gap-2 rounded p-1.5 transition-colors hover:bg-accent">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onChange(valStr, true)}
              className="h-3.5 w-3.5 rounded border-input bg-background text-primary accent-primary focus:ring-ring"
            />
            <span className="text-xs text-foreground">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
};
