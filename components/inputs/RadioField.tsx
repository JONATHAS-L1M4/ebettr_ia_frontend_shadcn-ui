import React from 'react';
import { ConfigField, SelectOption } from '../../types';

interface RadioFieldProps {
  field: ConfigField;
  onChange: (value: string) => void;
}

export const RadioField: React.FC<RadioFieldProps> = ({ field, onChange }) => {
  const options: SelectOption[] = (field.options || []).map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  return (
    <div className="space-y-1">
      {options.map((opt) => {
        const valStr = String(opt.value);
        const isSelected = (field.value as string) === valStr;

        return (
          <label key={valStr} className="group/radio flex cursor-pointer items-center gap-2">
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                isSelected
                  ? 'border-foreground bg-background'
                  : 'border-border bg-background group-hover/radio:border-ring/70'
              }`}
            >
              {isSelected && <div className="h-2 w-2 rounded-full bg-foreground" />}
            </div>
            <input
              type="radio"
              name={field.id}
              className="hidden"
              checked={isSelected}
              onChange={() => onChange(valStr)}
            />
            <span className={`text-sm transition-colors ${isSelected ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
};
