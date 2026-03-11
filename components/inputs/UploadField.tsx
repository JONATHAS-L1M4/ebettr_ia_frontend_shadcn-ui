import React, { useRef, useState } from 'react';
import { ConfigField } from '../../types';
import { Upload, Trash2, FileJson, CheckCircle2 } from '../ui/Icons';

interface UploadFieldProps {
  field: ConfigField;
  onChange: (value: string | string[]) => void;
}

export const UploadField: React.FC<UploadFieldProps> = ({ field, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const acceptString = field.allowedFileTypes?.join(',') || '';

  const currentValues: string[] = Array.isArray(field.value)
    ? field.value
    : field.value
      ? [field.value as string]
      : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;

    if (!files || files.length === 0) return;

    const newFileNames: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];

      if (field.maxFileSize) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > field.maxFileSize) {
          setError(`O arquivo "${file.name}" excede o limite de ${field.maxFileSize}MB.`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      newFileNames.push(file.name);
    }

    onChange([...currentValues, ...newFileNames]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const updated = currentValues.filter((_, index) => index !== indexToRemove);
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        className={`
          group/upload relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-dashed bg-card p-4 shadow-sm transition-colors
          ${error ? 'border-destructive/40 bg-destructive/10' : 'border-border hover:border-ring/70 hover:bg-accent/25'}
        `}
      >
        <div className="rounded-full border border-border bg-muted/40 p-2 transition-colors group-hover/upload:bg-accent/30">
          <Upload className={`h-4 w-4 transition-colors ${error ? 'text-destructive' : 'text-muted-foreground group-hover/upload:text-foreground'}`} />
        </div>

        <div className="text-center">
          <span className={`text-xs font-medium ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
            {error || field.placeholder || 'Clique para selecionar arquivos'}
          </span>
          <p className="mt-1 text-[10px] text-muted-foreground">Multi-upload habilitado</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptString}
          onChange={handleFileChange}
          multiple
        />
      </label>

      {currentValues.length > 0 && (
        <div className="animate-fade-in space-y-1.5 rounded-md border border-border bg-muted/30 p-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Selecionados ({currentValues.length})
            </span>
            <button
              onClick={() => onChange([])}
              className="text-[10px] text-destructive transition-colors hover:opacity-80 hover:underline"
            >
              Limpar tudo
            </button>
          </div>

          {currentValues.map((fileName, index) => (
            <div key={`${fileName}-${index}`} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                <span className="truncate text-xs font-medium text-foreground">{fileName}</span>
              </div>

              <button
                onClick={() => handleRemoveFile(index)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pl-1 text-[10px] text-muted-foreground">
        {field.allowedFileTypes && field.allowedFileTypes.length > 0 && (
          <div className="flex items-center gap-1">
            <FileJson className="h-3 w-3" />
            <span>{field.allowedFileTypes.join(', ')}</span>
          </div>
        )}

        {field.maxFileSize && (
          <div className="flex items-center gap-1">
            <span className="rounded bg-muted px-1 font-semibold text-muted-foreground">
              Max: {field.maxFileSize}MB
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
