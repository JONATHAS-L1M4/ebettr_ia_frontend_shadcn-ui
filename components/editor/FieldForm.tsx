
import React, { useState, useEffect, useMemo } from 'react';
import { ConfigField, FieldType } from '../../types';
import { Code, RotateCcw, FileJson, Shield, CircleHelp, Upload, Globe, LayoutGrid, Eye } from '../ui/Icons';
import Toggle from '../ui/Toggle';

const inputBaseClass =
  'w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50';
const controlBaseClass =
  'w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50';
const selectBaseClass =
  'w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background placeholder:text-muted-foreground shadow-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer';
import { encryptPath } from '../../utils/encryption';

// Imported Inputs for Default Value preview
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
import { AnnotationField } from '../inputs/AnnotationField';

interface FieldFormProps {
  initialField?: ConfigField | null;
  onSave: (field: ConfigField) => void;
  onCancelEdit: () => void;
  selectedJsonPath: string;
  suggestedType?: FieldType | null;
  parentWidth?: '33%' | '66%' | '100%'; // Largura do Card Pai para validação
  usedJsonPaths?: string[]; // Lista de caminhos já utilizados para evitar duplicidade
}

const generateUUIDv7 = () => {
    const timestamp = Date.now().toString(16).padStart(12, '0');
    const random = () => Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0');
    return `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-7${random().substring(1)}-a${random().substring(1)}-${random()}${random()}${random()}`;
};

export const FieldForm: React.FC<FieldFormProps> = ({ 
    initialField, 
    onSave, 
    onCancelEdit, 
    selectedJsonPath, 
    suggestedType,
    parentWidth = '100%',
    usedJsonPaths = []
}) => {
  const [id, setId] = useState(generateUUIDv7());
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [layoutWidth, setLayoutWidth] = useState<'33%' | '66%' | '100%'>('100%'); 
  const [required, setRequired] = useState(false);
  const [secret, setSecret] = useState(false); 
  const [jsonPath, setJsonPath] = useState(''); 
  const [jsonPathError, setJsonPathError] = useState<string | null>(null);
  const [options, setOptions] = useState('');
  const [allowedFileTypes, setAllowedFileTypes] = useState(''); 
  const [maxFileSize, setMaxFileSize] = useState<number | ''>(''); 
  const [uploadUrl, setUploadUrl] = useState(''); 
  const [baseUrl, setBaseUrl] = useState(''); 
  const [allowRefresh, setAllowRefresh] = useState(false); // Default false for Webhook
  const [placeholder, setPlaceholder] = useState('');
  const [helpText, setHelpText] = useState('');
  const [notes, setNotes] = useState(''); // New state for internal notes
  const [rows, setRows] = useState<number | ''>(''); // New state for textarea rows
  const [defaultValue, setDefaultValue] = useState<any>('');
  
  // Validation
  const [min, setMin] = useState<number | ''>('');
  const [max, setMax] = useState<number | ''>('');
  const [minLen, setMinLen] = useState<number | ''>('');
  const [maxLen, setMaxLen] = useState<number | ''>('');
  const getWidthTabClass = (isActive: boolean) =>
    [
      'flex flex-1 h-full items-center justify-center rounded-md px-3 py-1.5 text-[10px] font-semibold tracking-wide transition-all duration-200 ease-out sm:text-xs',
      isActive
        ? 'bg-[#202020] text-foreground shadow-[0_8px_24px_-16px_rgba(0,0,0,0.9)]'
        : 'text-muted-foreground hover:bg-card/85 hover:text-foreground'
    ].join(' ');

  // Helper para exibir o caminho legível (Raw Path)
  const displayRawPath = useMemo(() => {
      if (selectedJsonPath) return selectedJsonPath; // Prioridade para seleção ativa no mapper
      if (!jsonPath) return '';
      try {
          // Tenta decodificar caso seja um ID gerado (Base64URL)
          let base64 = jsonPath.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) base64 += '=';
          return atob(base64);
      } catch (e) {
          return jsonPath; // Fallback para valor bruto se não for base64
      }
  }, [jsonPath, selectedJsonPath]);

  // Update JSON Path when selectedJsonPath changes (from Mapper)
  useEffect(() => {
    if (selectedJsonPath) {
      // CRIPTOGRAFIA: O caminho é convertido em um ID opaco
      const encrypted = encryptPath(selectedJsonPath);
      
      // Validação de Duplicidade
      if (usedJsonPaths.includes(encrypted)) {
          setJsonPathError('Este caminho JSON já está sendo usado por outro campo.');
      } else {
          setJsonPathError(null);
      }

      setJsonPath(encrypted);
      
      if (suggestedType && !initialField) {
          setType(suggestedType);
      }
    }
  }, [selectedJsonPath, suggestedType, initialField, usedJsonPaths]);

  // Update form when initialField changes (Edit Mode)
  useEffect(() => {
    if (initialField) {
      setId(initialField.id);
      setLabel(initialField.label);
      setType(initialField.type);
      setLayoutWidth(initialField.layoutWidth || '100%');
      setRequired(initialField.required || false);
      setSecret(initialField.secret || false);
      setJsonPath(initialField.jsonPath || '');
      setJsonPathError(null);
      setPlaceholder(initialField.placeholder || '');
      setHelpText(initialField.helpText || '');
      setNotes(initialField.notes || ''); // Initialize notes
      setRows(initialField.rows !== undefined ? initialField.rows : ''); // Initialize rows
      setOptions(initialField.options ? initialField.options.join(', ') : '');
      setAllowedFileTypes(initialField.allowedFileTypes ? initialField.allowedFileTypes.join(', ') : '');
      setMaxFileSize(initialField.maxFileSize !== undefined ? initialField.maxFileSize : '');
      setUploadUrl(initialField.uploadUrl || '');
      setBaseUrl(initialField.baseUrl || '');
      setAllowRefresh(initialField.allowRefresh !== undefined ? initialField.allowRefresh : false);
      setDefaultValue(initialField.defaultValue !== undefined ? initialField.defaultValue : initialField.value);
      setMin(initialField.min !== undefined ? initialField.min : '');
      setMax(initialField.max !== undefined ? initialField.max : '');
      setMinLen(initialField.minLength !== undefined ? initialField.minLength : '');
      setMaxLen(initialField.maxLength !== undefined ? initialField.maxLength : '');
    } else {
      resetForm();
    }
  }, [initialField]);

  // --- LÓGICA DE PROPORÇÃO (GRID) ---
  // Define quais larguras são permitidas baseadas na largura do Card Pai
  const availableWidths = useMemo(() => {
      // Regra: Card 33% -> Campos somente 100%
      if (parentWidth === '33%') {
          return [{ val: '100%', label: '100% (Full)' }];
      }
      
      // Regra: Card 66% -> Campos entre 66% e 100%
      if (parentWidth === '66%') {
          return [
            { val: '33%', label: '33% (1/3)' },
            { val: '66%', label: '66% (2/3)' },
            { val: '100%', label: '100% (Full)' }
          ];
      }

      // Regra: Card 100% -> Campos entre 33% e 100%
      return [
          { val: '33%', label: '33% (1/3)' },
          { val: '66%', label: '66% (2/3)' },
          { val: '100%', label: '100% (Full)' }
      ];
  }, [parentWidth]);

  // Se o parentWidth mudar e a opção selecionada não for mais válida, reseta para 100%
  useEffect(() => {
      const isValid = availableWidths.some(opt => opt.val === layoutWidth);
      if (!isValid) {
          setLayoutWidth('100%');
      }
  }, [parentWidth, availableWidths, layoutWidth]);


  // Reset defaults on type change
  useEffect(() => {
      if (!initialField || (initialField && type !== initialField.type)) {
          if (type === 'checkbox' || type === 'switch') setDefaultValue(false);
          else if (type === 'number_int' || type === 'number_dec') setDefaultValue(0);
          else if (type === 'multiselect' || type === 'multicheckbox' || type === 'upload') setDefaultValue([]);
          else if (type === 'uuid') {
              setDefaultValue('');
              setAllowRefresh(false);
          }
          else setDefaultValue('');
          
          setMin(''); setMax('');
          
          setOptions('');
          setAllowedFileTypes('');
          setMaxFileSize('');
          setUploadUrl('');
          setBaseUrl('');
          setSecret(false); 
      }
  }, [type]);

  const resetForm = () => {
      setId(generateUUIDv7());
      setLabel('');
      setType('text');
      setLayoutWidth('100%');
      setRequired(false);
      setSecret(false);
      setJsonPath('');
      setOptions('');
      setAllowedFileTypes('');
      setMaxFileSize('');
      setUploadUrl('');
      setBaseUrl('');
      setAllowRefresh(false);
      setPlaceholder('');
      setHelpText('');
      setNotes(''); // Reset notes
      setRows(''); // Reset rows
      setDefaultValue('');
      setMin('');
      setMax('');
      setMinLen('');
      setMaxLen('');
  };

  const isUploadType = type === 'upload';
  const isUuidType = type === 'uuid';
  const isAnnotationType = type === 'annotation';
  const needsOptions = ['select', 'multiselect', 'multicheckbox', 'radio'].includes(type);

  const handleBaseUrlBlur = () => {
      if (!baseUrl) return;
      
      let formatted = baseUrl.trim();
      
      // Adiciona https:// se faltar
      if (!/^https?:\/\//i.test(formatted)) {
          formatted = `https://${formatted}`;
      }

      setBaseUrl(formatted);
  };

  const handleSave = () => {
    if (isUploadType && !uploadUrl) return;

    const finalLabel = label.trim() || 'Campo Sem Nome';
    
    // Process Options for Selects
    const parsedOptions = needsOptions 
        ? options.split(',').map(s => s.trim()).filter(s => s !== '') 
        : undefined;

    // Process Allowed File Types for Upload
    const parsedAllowedTypes = (type === 'upload')
        ? allowedFileTypes.split(',').map(s => s.trim()).filter(s => s !== '')
        : undefined;

    let finalVal = defaultValue;
    if ((type === 'number_int' || type === 'number_dec') && typeof finalVal === 'string') {
        finalVal = Number(finalVal) || 0;
    }

    const field: ConfigField = {
      id: id.trim() || generateUUIDv7(),
      label: finalLabel,
      type,
      layoutWidth,
      required,
      secret,
      jsonPath: jsonPath || undefined,
      placeholder,
      helpText,
      notes: notes.trim() || undefined, // Save notes
      rows: (type === 'textarea' && rows !== '') ? Number(rows) : undefined,
      value: finalVal,
      defaultValue: finalVal,
      options: parsedOptions,
      allowedFileTypes: parsedAllowedTypes,
      maxFileSize: (type === 'upload' && maxFileSize !== '') ? Number(maxFileSize) : undefined,
      uploadUrl: (type === 'upload' && uploadUrl) ? uploadUrl : undefined,
      baseUrl: (type === 'uuid' && baseUrl) ? baseUrl : undefined,
      allowRefresh: (type === 'uuid') ? false : undefined, // Force false for Webhook type
      min: min !== '' ? Number(min) : undefined,
      max: max !== '' ? Number(max) : undefined,
      minLength: minLen !== '' ? Number(minLen) : undefined,
      maxLength: maxLen !== '' ? Number(maxLen) : undefined,
    };

    onSave(field);
    if (!initialField) resetForm();
  };

  const renderInputComponent = (
    field: ConfigField, 
    onChange: (val: any) => void
  ) => {
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
        case 'annotation': return <AnnotationField field={effectiveField} />;
        default: return <TextField field={effectiveField} onChange={onChange} />;
    }
  };

  const fieldTypes: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'String (Texto)' },
    { value: 'textarea', label: 'String (Longa)' },
    { value: 'url', label: 'URL (Link)' },
    { value: 'number_int', label: 'Number (Integer)' },
    { value: 'number_dec', label: 'Number (Float)' },
    { value: 'email', label: 'Email' },
    { value: 'switch', label: 'Boolean (Switch)' },
    { value: 'select', label: 'Enum (Select)' },
    { value: 'multiselect', label: 'Array (MultiSelect)' },
    { value: 'checkbox', label: 'Boolean (Checkbox)' },
    { value: 'upload', label: 'Arquivo (Upload)' },
    { value: 'uuid', label: 'Webhook' }, 
    { value: 'annotation', label: 'Anotação (Markdown)' },
  ];

  const labelClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1";
  const isLengthType = ['text', 'textarea', 'email', 'url'].includes(type);
  const isValueType = ['number_int', 'number_dec'].includes(type);

  const canSave = (isUploadType ? !!uploadUrl : !!label) && !jsonPathError;

  return (
    <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    {initialField ? 'Editar Campo' : 'Novo Campo'}
                </h3>
            </div>
            {initialField && (
                <button onClick={onCancelEdit} className="text-xs font-medium text-destructive hover:text-destructive/80 hover:underline">
                    Cancelar Edição
                </button>
            )}
        </div>

        <div className="space-y-5 p-5 rounded-lg border bg-muted/40 border-border">
            
            {/* Identity Row */}
            <div className="space-y-1">
                    <label className={labelClass}>
                    Rótulo (Display Name) <span className="text-destructive">*</span>
                    </label>
                    <input 
                    value={label} onChange={e => setLabel(e.target.value)}
                    className={inputBaseClass} 
                    placeholder={isUploadType ? 'Arquivos Anexados' : "Ex: Webhook de Integração"}
                    />
            </div>

            {/* Layout Width Selector - Dynamic Options */}
            <div className="space-y-1">
                <label className={labelClass}>
                    <LayoutGrid className="w-3 h-3" /> Proporção do Campo
                </label>
                <div className="flex h-[36px] w-full items-center gap-2 rounded-lg bg-muted/60 p-1 shadow-inner">
                    {availableWidths.map((opt) => (
                        <button 
                            key={opt.val}
                            type="button"
                            onClick={() => setLayoutWidth(opt.val as any)}
                            className={getWidthTabClass(layoutWidth === opt.val)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {parentWidth !== '100%' && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                        Opções limitadas pela largura do card ({parentWidth}).
                    </p>
                )}
            </div>

            {/* JSON Path Display (Readable) */}
            {!isUploadType && !isUuidType && (
                <div className="space-y-1 animate-fade-in">
                    <label className={labelClass}>
                        Caminho Mapeamento JSON
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-2.5 text-muted-foreground">
                            <FileJson className="w-4 h-4" />
                        </div>
                        <input 
                            value={displayRawPath}
                            readOnly
                            className={`${inputBaseClass} pl-9 font-mono text-xs bg-muted/40 text-muted-foreground cursor-not-allowed focus:ring-0 focus:border-border shadow-inner ${jsonPathError ? 'border-destructive/40 bg-destructive/10' : ''}`} 
                            placeholder="Selecione no payload ao lado..."
                        />
                    </div>
                    {jsonPathError && (
                        <p className="text-[10px] text-destructive font-medium mt-1 animate-pulse">
                            {jsonPathError}
                        </p>
                    )}
                </div>
            )}

            {/* JSON Path - Visível sempre que não for upload e não for uuid */}
            {!isUploadType && !isUuidType && (
                <div className="space-y-1 animate-fade-in">
                    <label className={labelClass}>
                        ID Interno (Gerado)
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-2.5 text-muted-foreground">
                            <Shield className="w-4 h-4" />
                        </div>
                        <input 
                            value={jsonPath}
                            readOnly
                            className={`${inputBaseClass} pl-9 font-mono text-xs bg-muted/40 text-muted-foreground cursor-not-allowed focus:ring-0 focus:border-border shadow-inner`} 
                            placeholder="Gerado automaticamente"
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Identificador único criptografado.</p>
                </div>
            )}

            {/* WEBHOOK URL (Upload Only) */}
            {isUploadType && (
                <div className="space-y-1 animate-fade-in">
                    <label className={labelClass}>
                        Webhook URL (Upload) <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-2.5 text-muted-foreground">
                            <Globe className="w-4 h-4" />
                        </div>
                        <input 
                            value={uploadUrl} onChange={e => setUploadUrl(e.target.value)}
                            className={`${inputBaseClass} pl-9 font-mono text-xs`} 
                            placeholder="https://webhook.n8n.io/..."
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">URL para onde os arquivos serão enviados via POST.</p>
                </div>
            )}

            {/* WEBHOOK URL CONFIG (UUID Type) */}
            {isUuidType && (
                <div className="space-y-1 animate-fade-in">
                    <label className={labelClass}>
                        URL do Webhook <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-2.5 text-muted-foreground">
                            <Globe className="w-4 h-4" />
                        </div>
                        <input 
                            value={baseUrl} 
                            onChange={e => setBaseUrl(e.target.value)}
                            onBlur={handleBaseUrlBlur}
                            className={`${inputBaseClass} pl-9 font-mono text-xs`} 
                            placeholder="https://n8n.ebettr.com/webhook/..."
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        Este link será exibido para o usuário copiar.
                    </p>
                </div>
            )}

            {/* TYPE & REQUIRED */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className={labelClass}>Tipo de Dado</label>
                    <select value={type} onChange={e => setType(e.target.value as any)} className={selectBaseClass}>
                        {fieldTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>Obrigatório</label>
                    <div className={`h-[32px] px-3 bg-card border rounded-md flex items-center justify-between border-border ${isAnnotationType ? 'opacity-50 pointer-events-none' : ''}`}>
                        <span className="text-xs text-muted-foreground">{required ? 'Sim' : 'Opcional'}</span>
                        <Toggle checked={required} onChange={setRequired} size="sm" />
                    </div>
                </div>
            </div>

            {/* TEXTAREA ROWS */}
            {type === 'textarea' && (
                <div className="space-y-1 animate-fade-in">
                    <label className={labelClass}>Altura (Linhas)</label>
                    <input 
                        type="number" 
                        value={rows} 
                        onChange={e => setRows(e.target.value === '' ? '' : Number(e.target.value))} 
                        className={inputBaseClass} 
                        placeholder="Padrão: 4" 
                        min={2}
                        max={20}
                    />
                    <p className="text-[10px] text-muted-foreground">Define a altura inicial do campo de texto.</p>
                </div>
            )}

            {/* BASE URL & SETTINGS (UUID / Webhook Type) - REMOVED */}


            {/* 5. CONFIGURAÇÕES ESPECÍFICAS POR TIPO */}
            
            {needsOptions && (
                    <div className="space-y-1 animate-fade-in">
                    <label className={labelClass}>Opções</label>
                    <input value={options} onChange={e => setOptions(e.target.value)} className={inputBaseClass} placeholder="Opção A, Opção B, Opção C" />
                    </div>
            )}
            
            {type === 'upload' && (
                <div className="space-y-4 animate-fade-in">
                   <div className="space-y-1">
                       <div className="flex items-center gap-1">
                           <Upload className="w-3 h-3 text-muted-foreground" />
                           <label className={labelClass}>Tipos de Arquivo Permitidos</label>
                       </div>
                       <input 
                         value={allowedFileTypes} 
                         onChange={e => setAllowedFileTypes(e.target.value)} 
                         className={inputBaseClass} 
                         placeholder="Ex: .pdf, .jpg, .png, image/*" 
                       />
                       <p className="text-[10px] text-muted-foreground">Deixe vazio para permitir qualquer.</p>
                   </div>
                   
                   <div className="space-y-1">
                       <label className={labelClass}>Tamanho Máximo (MB)</label>
                       <input 
                         type="number"
                         value={maxFileSize} 
                         onChange={e => setMaxFileSize(Number(e.target.value))} 
                         className={inputBaseClass} 
                         placeholder="Ex: 5" 
                       />
                       <p className="text-[10px] text-muted-foreground">Deixe vazio para ilimitado (ou default).</p>
                   </div>
                </div>
            )}

            {/* ANNOTATION CONTENT */}
            {isAnnotationType && (
                <div className="space-y-1 animate-fade-in">
                    <label className={labelClass}>Conteúdo (Markdown)</label>
                    <textarea 
                        value={defaultValue} 
                        onChange={e => setDefaultValue(e.target.value)} 
                        className={`${controlBaseClass} font-mono text-xs`} 
                        rows={6}
                        placeholder="Digite sua anotação aqui... Suporta **Markdown**."
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Use Markdown para formatar o texto. Ex: **Negrito**, *Itálico*, [Link](url).
                    </p>
                </div>
            )}

            {/* 6. DEFAULT VALUE */}
            {type !== 'upload' && type !== 'uuid' && !isAnnotationType && (
                <div className="space-y-1">
                    <label className={labelClass}>Valor Padrão (Default)</label>
                    {needsOptions && options.trim().length === 0 ? (
                        <div className="text-xs text-muted-foreground italic p-2 rounded border border-dashed text-center bg-muted/40 border-border">
                            Defina as <strong>Opções</strong> acima para selecionar um valor padrão.
                        </div>
                    ) : (
                        renderInputComponent(
                            {
                                id: 'default-val-setter',
                                label: 'Default',
                                type: type,
                                value: defaultValue,
                                options: options.split(',').map(s => s.trim()).filter(s => s !== ''),
                                allowedFileTypes: allowedFileTypes.split(',').map(s => s.trim()).filter(s => s !== ''),
                                allowRefresh: false, 
                                baseUrl: baseUrl, // Preview Base URL
                                min: min !== '' ? Number(min) : undefined,
                                max: max !== '' ? Number(max) : undefined,
                                placeholder: 'Valor inicial...',
                                required: false,
                                secret: secret // Preview secret behavior
                            } as ConfigField, 
                            (val) => setDefaultValue(val)
                        )
                    )}
                </div>
            )}
            
            {/* 7. HELP TEXT & PLACEHOLDER */}
            {!isUuidType && !isAnnotationType && (
                <div className="space-y-1">
                    <label className={labelClass}>Placeholder</label>
                    <input value={placeholder} onChange={e => setPlaceholder(e.target.value)} className={inputBaseClass} placeholder="Texto fantasma no input..." />
                </div>
            )}
            {!isAnnotationType && (
            <div className="space-y-1">
                <label className={labelClass}>Texto de Ajuda</label>
                <input value={helpText} onChange={e => setHelpText(e.target.value)} className={inputBaseClass} placeholder="Instrução exibida ao passar o mouse..." />
            </div>
            )}

            {!isAnnotationType && (
            <div className="space-y-1">
                <label className={labelClass}>Anotações Internas (Notas)</label>
                <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    className={`${controlBaseClass} min-h-[80px]`} 
                    placeholder="Notas para uso interno do administrador..." 
                />
                <p className="text-[10px] text-muted-foreground">Estas notas não são visíveis para o cliente.</p>
            </div>
            )}

            {/* 8. VALIDATION RULES */}
            {!isAnnotationType && (isLengthType || isValueType) && (
                <div className="pt-2 border-t mt-2 border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Regras de Validação</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClass}>
                                {isLengthType ? 'Mínimo (Caracteres)' : 'Valor Mínimo'}
                            </label>
                            <input 
                                type="number" 
                                value={isLengthType ? minLen : min} 
                                onChange={e => isLengthType ? setMinLen(Number(e.target.value)) : setMin(Number(e.target.value))} 
                                className={inputBaseClass} 
                                placeholder="0" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>
                                {isLengthType ? 'Máximo (Caracteres)' : 'Valor Máximo'}
                            </label>
                            <input 
                                type="number" 
                                value={isLengthType ? maxLen : max} 
                                onChange={e => isLengthType ? setMaxLen(Number(e.target.value)) : setMax(Number(e.target.value))} 
                                className={inputBaseClass} 
                                placeholder="Inf" 
                            />
                        </div>
                    </div>
                    {isLengthType && (minLen !== '' || maxLen !== '') && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                            <CircleHelp className="w-3 h-3" />
                            <span className="cursor-help hover:underline">
                                Requisito visível: "O campo deve ter entre {minLen || '0'} e {maxLen || '∞'} caracteres."
                            </span>
                        </div>
                    )}
                </div>
            )}

            <button 
                onClick={handleSave}
                disabled={!canSave}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
                <RotateCcw className="w-4 h-4" /> Atualizar Campo
            </button>
        </div>
    </div>
  );
};
