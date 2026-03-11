
import React, { useState } from 'react';
import { ConfigField } from '../../types';
import { controlBaseClass } from './styles';
import { Maximize2 } from '../ui/Icons';
import { ExpandedTextModal } from './ExpandedTextModal';

interface TextAreaFieldProps {
  field: ConfigField;
  onChange: (value: string) => void;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({ field, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const value = field.value as string || '';
  const currentLength = value.length;
  const maxLength = field.maxLength;

  const handleSaveExpand = (newValue: string) => {
    onChange(newValue);
    setIsExpanded(false);
  };

  return (
    <>
      <div className="relative group">
        <textarea 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows || 4}
          minLength={field.minLength}
          maxLength={field.maxLength}
          className={`${controlBaseClass} resize-none pr-8`}
          style={field.rows ? undefined : { height: '100px' }}
        />

        {/* Botão de Expandir */}
        <button 
          type="button"
          onClick={() => setIsExpanded(true)}
          className="absolute right-2 top-2 mt-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:text-foreground"
          title="Expandir editor"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Contador de Caracteres 0/max */}
        <div className={`text-[9px] text-right mt-1 font-mono transition-colors ${
            maxLength && currentLength >= maxLength ? 'text-red-500 font-bold' : 
            maxLength && currentLength >= maxLength * 0.9 ? 'text-amber-500' : 'text-muted-foreground'
        }`}>
            {currentLength}{maxLength ? `/${maxLength}` : ''}
        </div>
      </div>

      <ExpandedTextModal 
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        onSave={handleSaveExpand}
        label={field.label}
        value={value}
        maxLength={field.maxLength}
      />
    </>
  );
};
