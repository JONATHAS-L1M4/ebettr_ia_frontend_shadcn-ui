
import React, { useState } from 'react';
import { ConfigField } from '../../types';
import { inputBaseClass } from './styles';
import { Maximize2 } from '../ui/Icons';
import { ExpandedTextModal } from './ExpandedTextModal';

interface TextFieldProps {
  field: ConfigField;
  onChange: (value: string) => void;
}

export const TextField: React.FC<TextFieldProps> = ({ field, onChange }) => {
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
        <input 
          type={field.type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          minLength={field.minLength}
          maxLength={field.maxLength}
          className={`${inputBaseClass} pr-8`} // Espaço extra para o botão
        />
        
        {/* Botão de Expandir (aparece no hover) */}
        {!field.secret && (
          <button 
            type="button"
            onClick={() => setIsExpanded(true)}
            className="absolute right-2 top-2 mt-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:text-foreground"
            title="Expandir editor"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}

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
