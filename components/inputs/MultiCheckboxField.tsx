import React from 'react';
import { ConfigField, SelectOption } from '../../types';
import { CheckCircle2 } from '../ui/Icons';

interface MultiCheckboxFieldProps {
  field: ConfigField;
  onChange: (option: string, isMulti: boolean) => void;
}

export const MultiCheckboxField: React.FC<MultiCheckboxFieldProps> = ({ field, onChange }) => {
  const options: SelectOption[] = (field.options || []).map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  return (
    <div className="space-y-1">
      {options.map((opt) => {
        const valStr = String(opt.value);
        const isSelected = (field.value as string[]).includes(valStr);

        return (
          <label key={valStr} className="group/chk flex cursor-pointer items-center gap-2">
            <div
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                isSelected
                  ? 'border-foreground bg-foreground'
                  : 'border-border bg-background group-hover/chk:border-ring/70'
              }`}
            >
              {isSelected && <CheckCircle2 className="h-3 w-3 text-background" />}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={isSelected}
              onChange={() => onChange(valStr, true)}
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
