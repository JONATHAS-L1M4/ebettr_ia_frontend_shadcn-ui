
import React from 'react';
import { ConfigField, SelectOption } from '../../types';

const selectBaseClass =
  'w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer';

interface SelectFieldProps {
  field: ConfigField;
  onChange: (value: string | number) => void;
}

export const SelectField: React.FC<SelectFieldProps> = ({ field, onChange }) => {
  const normalizeOptions = (): SelectOption[] => {
    if (!field.options) return [];
    return field.options.map(opt => {
        if (typeof opt === 'string') {
            return { label: opt, value: opt };
        }
        return opt as SelectOption;
    });
  };

  const options = normalizeOptions();

  // Find the current selected option object to determine type if needed, 
  // but for rendering we need string.
  const currentValString = String(field.value !== undefined ? field.value : '');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const valStr = e.target.value;
      const selectedOpt = options.find(o => String(o.value) === valStr);
      if (selectedOpt) {
          onChange(selectedOpt.value);
      } else {
          onChange(valStr);
      }
  };

  return (
    <div className="relative">
      <select 
        value={currentValString}
        onChange={handleSelectChange}
        className={selectBaseClass}
      >
        <option value="" disabled>Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-2.5 pointer-events-none text-muted-foreground">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  );
};
