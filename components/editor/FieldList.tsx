
import React from 'react';
import { ConfigField, FieldType } from '../../types';
import { Activity, Box, Trash2, CircleHelp, ChevronUp, ChevronDown, Lock, Download, Upload, Plus } from '../ui/Icons';
import { TextField } from '../inputs/TextField';
import { TextAreaField } from '../inputs/TextAreaField';
import { NumberField } from '../inputs/NumberField';
import { SelectField } from '../inputs/SelectField';
import { MultiSelectField } from '../inputs/MultiSelectField';
import { CheckboxField } from '../inputs/CheckboxField';
import { MultiCheckboxField } from '../inputs/MultiCheckboxField';
import { RadioField } from '../inputs/RadioField';
import { SwitchField } from '../inputs/SwitchField';
import { UploadField } from '../inputs/UploadField';
import { UuidField } from '../inputs/UuidField';
import { UrlField } from '../inputs/UrlField';

interface FieldListProps {
  fields: ConfigField[];
  onEdit: (field: ConfigField) => void;
  onRemove: (id: string) => void;
  onReorder: (index: number, direction: 'up' | 'down') => void;
  onPreviewChange: (id: string, value: any) => void;
  onImport?: (fields: ConfigField[]) => void;
  onAddField?: () => void;
  editingFieldId: string | null;
}

export const FieldList: React.FC<FieldListProps> = ({ 
  fields, onEdit, onRemove, onReorder, onPreviewChange, onImport, onAddField, editingFieldId
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(fields, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `form-fields-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedFields = JSON.parse(content);
        if (Array.isArray(importedFields) && onImport) {
          onImport(importedFields);
        } else {
          alert('Arquivo inválido ou formato incorreto.');
        }
      } catch (error) {
        console.error('Erro ao importar:', error);
        alert('Erro ao ler o arquivo JSON.');
      }
      // Reset input value to allow importing the same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const renderInputComponent = (
    field: ConfigField, 
    onChange: (val: any) => void
  ) => {
    // Força password se for secreto
    const effectiveField = field.secret && (field.type === 'text' || field.type === 'email' || field.type === 'url') 
        ? { ...field, type: 'password' as FieldType } 
        : field;

    switch (effectiveField.type) {
        case 'text': case 'email': case 'password': return <TextField field={effectiveField} onChange={onChange} />;
        case 'url': return <UrlField field={effectiveField} onChange={onChange} />;
        case 'textarea': return <TextAreaField field={effectiveField} onChange={onChange} />;
        case 'number_int': case 'number_dec': return <NumberField field={effectiveField} onChange={onChange} />;
        case 'select': return <SelectField field={effectiveField} onChange={onChange} />;
        case 'multiselect': return <MultiSelectField field={effectiveField} onChange={(opt) => {
            const current = Array.isArray(field.value) ? field.value : [];
            onChange(current.includes(opt) ? current.filter(v => v !== opt) : [...current, opt]);
        }} />;
        case 'checkbox': return <CheckboxField field={effectiveField} onChange={onChange} />;
        case 'multicheckbox': return <MultiCheckboxField field={effectiveField} onChange={(opt) => {
            const current = Array.isArray(field.value) ? field.value : [];
            onChange(current.includes(opt) ? current.filter(v => v !== opt) : [...current, opt]);
        }} />;
        case 'radio': return <RadioField field={effectiveField} onChange={onChange} />;
        case 'switch': return <SwitchField field={effectiveField} onChange={onChange} />;
        case 'upload': return <UploadField field={effectiveField} onChange={onChange} />;
        case 'uuid': return <UuidField field={effectiveField} onChange={onChange} />;
        case 'annotation': return <div className="text-sm text-muted-foreground italic border border-dashed border-border p-2 rounded bg-muted/40">Anotação: {field.defaultValue || '(Vazio)'}</div>;
        default: return <TextField field={effectiveField} onChange={onChange} />;
    }
  };

  return (
    <div className="h-full bg-muted/30 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Preview ({fields.length})
                </h3>
                <div className="flex items-center gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json" 
                        className="hidden" 
                    />
                    {onImport && (
                        <button 
                            onClick={handleImportClick}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            title="Importar Formulário"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        onClick={handleExport}
                        disabled={fields.length === 0}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Exportar Formulário"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    {fields.length > 0 && <span className="text-[10px] font-bold text-foreground bg-muted/60 border border-border px-2 py-0.5 rounded-full uppercase tracking-wider ml-2">Live Preview</span>}
                </div>
            </div>

            {fields.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl h-64 flex flex-col items-center justify-center text-muted-foreground gap-3 bg-card">
                        <Box className="w-10 h-10 opacity-20" />
                        <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Nenhum campo configurado</p>
                        <p className="text-xs mt-1">Utilize o editor ao lado para adicionar campos.</p>
                        </div>
                </div>
            ) : (
                <div className="grid grid-cols-6 gap-4">
                    {fields.map((field, index) => {
                        let colSpanClass = 'col-span-6'; // Default 100%
                        if (field.layoutWidth === '33%') colSpanClass = 'col-span-6 sm:col-span-2';
                        else if (field.layoutWidth === '66%') colSpanClass = 'col-span-6 sm:col-span-4';
                        else if (field.layoutWidth === '100%') colSpanClass = 'col-span-6';

                        return (
                        <div 
                            key={field.id}
                            onClick={() => onEdit(field)}
                            className={`
                                group relative p-4 rounded-lg bg-card border transition-all cursor-pointer shadow-sm ${colSpanClass}
                                ${editingFieldId === field.id ? 'border-border ring-1 ring-ring/40 shadow-sm' : 'border-border hover:border-border/80 hover:shadow-md'}
                            `}
                        >
                            {/* Actions (Delete + Reorder) */}
                            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onReorder(index, 'up'); }} 
                                    disabled={index === 0}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Mover para Cima"
                                >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onReorder(index, 'down'); }} 
                                    disabled={index === fields.length - 1}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Mover para Baixo"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <div className="w-[1px] h-4 bg-border mx-1"></div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRemove(field.id); }} 
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 mb-2 pr-20">
                                <label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1">
                                    {field.label}
                                    {field.secret && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                                </label>
                                {field.required && <span className="text-destructive font-bold">*</span>}
                                {field.helpText && (
                                    <div className="text-muted-foreground/70" title={field.helpText}>
                                        <CircleHelp className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>

                            <div onClick={(e) => e.stopPropagation()}>
                                {renderInputComponent(
                                    field,
                                    (val) => onPreviewChange(field.id, val)
                                )}
                            </div>
                            
                            <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider bg-muted/40 px-1 rounded">
                                        {field.layoutWidth || '100%'}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                        {field.type}
                                    </span>
                                </div>
                                <span className="text-[9px] font-mono text-muted-foreground/70" title="Field ID">
                                    {field.id.substring(0, 8)}...
                                </span>
                            </div>
                        </div>
                    )})}
                    {onAddField && (
                        <button
                            onClick={onAddField}
                            className="col-span-6 flex min-h-[96px] items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                            title="Adicionar Campo"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Campo
                        </button>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
