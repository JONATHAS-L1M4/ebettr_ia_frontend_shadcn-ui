
import React, { useState, useEffect } from 'react';
import { ConfigSection, ConfigField } from '../types';
// Adicionando Loader2 ao import de ícones
import { Brain, Settings, MessageSquare, Shield, Database, Pencil, Trash2, CircleHelp, X, RotateCcw, Cpu, Cloud, Code, Zap, Globe, Activity, Terminal, Key, Lock, ChevronDown, ChevronUp, Layers, Box, User, Mail, ArrowUp, ArrowDown } from './ui/Icons';
import { useNotification } from '../context/NotificationContext';
import { N8nWorkflow } from '../services/n8nService';
import SpotlightCard from './ui/SpotlightCard';

// Inputs Fracionados
import { TextField } from './inputs/TextField';
import { TextAreaField } from './inputs/TextAreaField';
import { NumberField } from './inputs/NumberField';
import { SelectField } from './inputs/SelectField';
import { MultiSelectField } from './inputs/MultiSelectField';
import { CheckboxField } from './inputs/CheckboxField';
import { MultiCheckboxField } from './inputs/MultiCheckboxField';
import { RadioField } from './inputs/RadioField';
import { SwitchField } from './inputs/SwitchField';
import { UploadField } from './inputs/UploadField';
import { UuidField } from './inputs/UuidField';
import { UrlField } from './inputs/UrlField';
import { WorkflowSearchField } from './inputs/WorkflowSearchField'; 
import { AnnotationField } from './inputs/AnnotationField'; 

interface ConfigCardProps {
  section: ConfigSection;
  onEdit?: (section: ConfigSection) => void;
  onDelete?: (sectionId: string) => void;
  onMoveUp?: (sectionId: string) => void;
  onMoveDown?: (sectionId: string) => void;
  onSaveSection?: (section: ConfigSection) => Promise<void> | void; 
  onWidthChange?: (sectionId: string, width: '33%' | '66%' | '100%') => void;
  isAdmin?: boolean;
  isLocked?: boolean; 
  variant?: 'default' | 'credential';
}

// Configuração de exibição inicial
const INITIAL_VISIBLE_COUNT = 6; // Aumentado devido ao grid mais fino

const ConfigCard: React.FC<ConfigCardProps> = ({ section, onEdit, onDelete, onMoveUp, onMoveDown, onSaveSection, onWidthChange, isAdmin, isLocked = false, variant = 'default' }) => {
  const { addNotification } = useNotification();
  const [fields, setFields] = useState<ConfigField[]>(section.fields);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  
  // State para o Modal de Ajuda
  const [activeHelp, setActiveHelp] = useState<{ title: string; text: string } | null>(null);
  
  // State para confirmação de reset
  const [confirmResetFieldId, setConfirmResetFieldId] = useState<string | null>(null);

  // State para confirmação de salvamento (Credenciais)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // State para Expansão (Show More / Show Less)
  const [isExpanded, setIsExpanded] = useState(false);

  // State para rastrear quais campos secretos foram modificados pelo usuário
  const [dirtySecretFields, setDirtySecretFields] = useState<Set<string>>(new Set());

  // Sincroniza o estado local 'fields' se a prop 'section' mudar
  useEffect(() => {
    setFields(section.fields);
    setDirtySecretFields(new Set()); // Reseta o rastreamento ao recarregar a seção
  }, [section]);

  // --- LÓGICA DE VISIBILIDADE CONDICIONAL ---
  const isFieldVisible = (field: ConfigField) => {
      if (!field.condition) return true;

      const triggerField = fields.find(f => f.id === field.condition!.field);
      if (!triggerField) return false;

      const triggerValue = triggerField.value;
      const conditionValue = field.condition.value;
      const operator = field.condition.operator || 'eq';

      let isMatch = false;

      if (Array.isArray(conditionValue)) {
          isMatch = conditionValue.some(val => val == triggerValue);
      } else {
          isMatch = triggerValue == conditionValue;
      }

      if (operator === 'eq') return isMatch;
      if (operator === 'neq') return !isMatch;

      return true;
  };

  const visibleFieldsList = fields.filter(isFieldVisible);

  const displayedFields = isExpanded 
    ? visibleFieldsList 
    : visibleFieldsList.slice(0, INITIAL_VISIBLE_COUNT);

  const hasHiddenFields = visibleFieldsList.length > INITIAL_VISIBLE_COUNT;
  const hiddenCount = visibleFieldsList.length - INITIAL_VISIBLE_COUNT;

  const getIcon = () => {
    const className = "w-5 h-5 transition-colors";
    switch (section.icon) {
      case 'brain': return <Brain className={className} />;
      case 'settings': return <Settings className={className} />;
      case 'message': return <MessageSquare className={className} />;
      case 'shield': return <Shield className={className} />;
      case 'database': return <Database className={className} />;
      case 'cpu': return <Cpu className={className} />;
      case 'cloud': return <Cloud className={className} />;
      case 'code': return <Code className={className} />;
      case 'zap': return <Zap className={className} />;
      case 'globe': return <Globe className={className} />;
      case 'activity': return <Activity className={className} />;
      case 'terminal': return <Terminal className={className} />;
      case 'key': return <Key className={className} />;
      case 'lock': return <Lock className={className} />;
      case 'layers': return <Layers className={className} />;
      case 'box': return <Box className={className} />;
      case 'user': return <User className={className} />;
      case 'mail': return <Mail className={className} />;
      default: return <Settings className={className} />;
    }
  };

  // Propagate changes up immediately
  const handleFieldChange = (id: string, value: any) => {
    // Permitir alteração de UUID mesmo se bloqueado (para que clientes possam rotacionar chaves)
    const targetField = fields.find(f => f.id === id);
    const isUuid = targetField?.type === 'uuid';
    
    if (isLocked && !isUuid) return;
    
    const field = fields.find(f => f.id === id);
    if (field?.secret) {
        setDirtySecretFields(prev => new Set(prev).add(id));
    }

    const newFields = fields.map(f => f.id === id ? { ...f, value } : f);
    setFields(newFields);
    
    // Notify parent immediately about changes
    if (onSaveSection) {
        onSaveSection({ ...section, fields: newFields });
    }
  };

  const handleWorkflowSelect = (workflow: N8nWorkflow) => {
    if (isLocked) return;
    
    const newFields = fields.map(f => {
        if (f.id === 'n8n_workflow_name') return { ...f, value: workflow.name };
        if (f.id === 'n8n_workflow_id') return { ...f, value: workflow.id };
        return f;
    });

    setFields(newFields);
    setLastSaved(null);

    if (onSaveSection) {
        onSaveSection({ ...section, fields: newFields });
    }
  };

  const handleResetField = (id: string) => {
    if (isLocked) return;
    const field = fields.find(f => f.id === id);
    if (field && field.defaultValue !== undefined) {
      handleFieldChange(id, field.defaultValue);
    }
    setConfirmResetFieldId(null);
  };

  const handleMultiSelectChange = (id: string, option: string, isMulti: boolean) => {
    if (isLocked) return;
    
    const newFields = fields.map(f => {
      if (f.id !== id) return f;
      
      const currentValues = Array.isArray(f.value) ? f.value : [];
      let newValues;
      
      if (currentValues.includes(option)) {
        newValues = currentValues.filter(v => v !== option);
      } else {
        newValues = [...currentValues, option];
      }
      
      return { ...f, value: newValues };
    });

    setFields(newFields);
    setLastSaved(null);

    if (onSaveSection) {
        onSaveSection({ ...section, fields: newFields });
    }
  };

  // --- VALIDAÇÃO ---
  const validateFields = () => {
      const visibleFields = fields.filter(isFieldVisible);
      const missingFields = visibleFields.filter(f => {
          if (!f.required) return false;
          const val = f.value;
          if (typeof val === 'string' && val.trim() === '') return true;
          if (Array.isArray(val) && val.length === 0) return true;
          if (val === null || val === undefined) return true;
          return false;
      });

      if (missingFields.length > 0) {
          const missingNames = missingFields.map(f => f.label).join(', ');
          addNotification('error', 'Campos Obrigatórios', `Por favor preencha: ${missingNames}`);
          return false;
      }
      return true;
  };

  const handleSaveClick = () => {
    // Permitir salvar se houver alterações em UUIDs, mesmo bloqueado
    const hasUuidChanges = fields.some(f => f.type === 'uuid' && f.value !== section.fields.find(sf => sf.id === f.id)?.value);
    if (isLocked && !hasUuidChanges) return;

    if (!validateFields()) return;
    if (variant === 'credential') {
        setShowSaveConfirmation(true);
    } else {
        executeSave();
    }
  };

  const executeSave = async () => {
    setShowSaveConfirmation(false);
    setIsSaving(true);
    const fieldsToSave = fields; 
    try {
        if (onSaveSection) {
            // Aguarda todo o ciclo de salvamento (n8n + manager + refresh) definido no pai
            await onSaveSection({ ...section, fields: fieldsToSave });
        }
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        addNotification('success', 'Alterações salvas', `As configurações de "${section.title}" foram atualizadas.`);
        setDirtySecretFields(new Set());
    } catch (e) {
        // Notificação de erro já é tratada no pai (AgentDetail)
    } finally {
        setIsSaving(false);
    }
  };

  const isValueModified = (field: ConfigField) => {
      if (field.defaultValue === undefined || field.defaultValue === null) return false;
      const current = field.value;
      const def = field.defaultValue;
      if (Array.isArray(current) && Array.isArray(def)) {
          if (current.length !== def.length) return true;
          const sortedCurrent = [...current].sort();
          const sortedDef = [...def].sort();
          return JSON.stringify(sortedCurrent) !== JSON.stringify(sortedDef);
      }
      if (field.type === 'upload') {
          const currentArr = Array.isArray(current) ? current : (current ? [current] : []);
          const defArr = Array.isArray(def) ? def : (def ? [def] : []);
          if (currentArr.length !== defArr.length) return true;
          return JSON.stringify(currentArr.sort()) !== JSON.stringify(defArr.sort());
      }
      return current !== def;
  };

  const renderInput = (field: ConfigField) => {
    if (field.id === 'n8n_workflow_name') {
        return (
            <WorkflowSearchField 
                field={field} 
                onChange={(val) => handleFieldChange(field.id, val)} 
                onSelectWorkflow={handleWorkflowSelect}
            />
        );
    }

    if (field.id === 'n8n_workflow_id') {
        return (
            <div className="relative">
                <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Code className="w-4 h-4" />
                </div>
                <input 
                    type="text" 
                    value={field.value as string} 
                    readOnly 
                    className="w-full pl-9 pr-3 py-2 bg-muted/40 border border-input rounded-md text-muted-foreground text-sm font-mono shadow-inner cursor-not-allowed select-all"
                />
            </div>
        );
    }

    let effectiveField = field;
    if (field.secret && (field.type === 'text' || field.type === 'email' || field.type === 'url')) {
        effectiveField = { ...field, type: 'password' };
        if (field.value && !dirtySecretFields.has(field.id)) {
            effectiveField = { 
                ...effectiveField, 
                value: '', 
                placeholder: '•••••••••••••••• (Oculto para segurança)' 
            };
        }
    }

    switch (effectiveField.type) {
        case 'text': case 'email': case 'password':
            return <TextField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'url':
            return <UrlField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'textarea':
            return <TextAreaField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'number_int': case 'number_dec':
            return <NumberField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'select':
            return <SelectField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'multiselect':
            return <MultiSelectField field={effectiveField} onChange={(opt) => handleMultiSelectChange(field.id, opt, true)} />;
        case 'checkbox':
            return <CheckboxField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'multicheckbox':
            return <MultiCheckboxField field={effectiveField} onChange={(opt) => handleMultiSelectChange(field.id, opt, true)} />;
        case 'radio':
            return <RadioField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'switch':
            return <SwitchField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'upload':
            return <UploadField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'uuid':
            return <UuidField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
        case 'annotation':
            return <AnnotationField field={effectiveField} />;
        default:
            return <TextField field={effectiveField} onChange={(val) => handleFieldChange(field.id, val)} />;
    }
  };

  const hasUuidChanges = fields.some(f => f.type === 'uuid' && f.value !== section.fields.find(sf => sf.id === f.id)?.value);
  const showSaveButton = !isLocked || hasUuidChanges;

  return (
    <>
      <SpotlightCard 
          enableOverflow={true}
          className={`group/card flex flex-col h-full border-border hover:border-border/80 ${isLocked ? 'opacity-85' : ''}`}
      >
        
        {/* Card Header Padronizado */}
        <div className="p-6 pb-2 flex items-start gap-4 justify-between relative z-20">
          <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 bg-muted/40 border border-border rounded-lg flex items-center justify-center text-foreground shrink-0 relative">
                {getIcon()}
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase truncate leading-tight">{section.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium leading-tight">{section.description}</p>
              </div>
          </div>

          {!isLocked && isAdmin && (
              <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0 relative">
                  {onMoveUp && (
                      <button 
                          onClick={() => onMoveUp(section.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          title="Mover para cima"
                      >
                          <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                  )}
                  {onMoveDown && (
                      <button 
                          onClick={() => onMoveDown(section.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          title="Mover para baixo"
                      >
                          <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                  )}
                  {onEdit && (
                      <button 
                          onClick={() => onEdit(section)}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar Módulo"
                      >
                          <Pencil className="w-3.5 h-3.5" />
                      </button>
                  )}
                  {onDelete && (
                      <button 
                          onClick={() => onDelete(section.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          title="Excluir Módulo"
                      >
                          <Trash2 className="w-3.5 h-3.5" />
                      </button>
                  )}
              </div>
          )}
        </div>

        {/* Card Body with Grid Layout using 6 columns system */}
        <div className="p-6 pt-4 flex-1 flex flex-col justify-between relative z-20">
          
          <div className="grid grid-cols-6 gap-4"> 
            {displayedFields.map(field => {
                const isModified = isValueModified(field);
                const isConfirmingReset = confirmResetFieldId === field.id;
                const isFieldDisabled = isLocked && field.type !== 'uuid';
                
                // Determine layout span based on layoutWidth (Grid 6)
                let colSpanClass = 'col-span-6'; // Default 100%
                
                if (field.layoutWidth === '33%') colSpanClass = 'col-span-6 sm:col-span-2'; // 2/6 = 1/3
                else if (field.layoutWidth === '66%') colSpanClass = 'col-span-6 sm:col-span-4'; // 4/6 = 2/3
                else if (field.layoutWidth === '100%') colSpanClass = 'col-span-6';
                
                return (
                <div key={field.id} className={`${colSpanClass} group relative animate-fade-in`}>
                    <fieldset disabled={isFieldDisabled} className="contents">
                        {field.type !== 'annotation' && (
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-muted-foreground block uppercase tracking-wide flex items-center gap-1">
                                    {field.label}
                                    {field.required && <span className="text-destructive">*</span>}
                                    {field.secret && <span title="Campo Secreto"><Lock className="w-2.5 h-2.5 text-muted-foreground ml-1" /></span>}
                                    {field.id === 'n8n_workflow_id' && <span className="text-[9px] text-muted-foreground bg-muted/40 px-1 rounded ml-1 border border-border">AUTO</span>}
                                </label>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {field.helpText && (
                                    <button 
                                        type="button"
                                        onClick={() => setActiveHelp({ title: field.label, text: field.helpText! })}
                                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none"
                                        title="Ver instruções"
                                    >
                                        <CircleHelp className="w-3.5 h-3.5" />
                                    </button>
                                )}

                                {isModified && !isLocked && field.id !== 'n8n_workflow_id' && field.type !== 'uuid' && (
                                    <div className="relative">
                                        <button 
                                            onClick={() => setConfirmResetFieldId(isConfirmingReset ? null : field.id)}
                                            className={`transition-all transform hover:text-foreground ${isConfirmingReset ? 'text-foreground rotate-180' : 'text-muted-foreground hover:rotate-[-45deg]'}`}
                                            title="Restaurar padrão"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                        
                                        {isConfirmingReset && (
                                            <div className="absolute right-0 top-6 z-50 bg-popover border border-border shadow-xl rounded-lg p-2 min-w-[140px] animate-fade-in flex flex-col gap-2">
                                                <p className="text-[10px] text-muted-foreground text-center font-medium border-b border-border pb-1">
                                                    Restaurar padrão?
                                                </p>
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => handleResetField(field.id)}
                                                        className="flex-1 bg-primary text-primary-foreground p-1 rounded hover:bg-primary/90 transition-colors text-[10px] font-bold"
                                                    >
                                                        Sim
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmResetFieldId(null)}
                                                        className="flex-1 bg-secondary text-secondary-foreground p-1 rounded hover:bg-accent transition-colors text-[10px] font-bold"
                                                    >
                                                        Não
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        )}
                        
                        {renderInput(field)}
                    </fieldset>
                </div>
                );
            })}
          </div>

          {hasHiddenFields && (
            <div className="mt-4 flex justify-center">
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors py-1.5 px-3 rounded-md hover:bg-accent"
              >
                {isExpanded ? (
                  <>
                    Mostrar Menos <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Mostrar Mais (+{hiddenCount}) <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Card Footer - REMOVED SAVE BUTTON */}
        <div className="p-4 px-6 pt-0 flex items-center justify-between relative z-20 h-2">
             {/* Empty footer to maintain spacing if needed, or remove completely */}
        </div>

        {/* CONFIRMATION OVERLAY */}
        {showSaveConfirmation && (
            <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in rounded-xl">
                <div className="text-center max-w-[280px] animate-scale-in">
                    <h4 className="text-sm font-bold text-foreground">Salvar Credenciais?</h4>
                    <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
                        Isso pode interromper a conexão do agente com serviços externos.
                    </p>
                    <div className="flex gap-2 justify-center">
                        <button 
                            onClick={() => setShowSaveConfirmation(false)}
                            className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded-md hover:bg-accent transition-colors uppercase tracking-wide"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={executeSave}
                            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90 transition-colors uppercase tracking-wide"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}
      </SpotlightCard>

      {/* HELP MODAL */}
      {activeHelp && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setActiveHelp(null)}
        >
          <div 
            className="bg-popover rounded-xl shadow-2xl border border-border w-full max-w-sm overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2 uppercase tracking-wide">
                  <CircleHelp className="w-4 h-4 text-foreground" />
                  Instruções
                </h3>
                <button 
                  onClick={() => setActiveHelp(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
             </div>
             <div className="p-6">
                <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">Campo: {activeHelp.title}</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {activeHelp.text}
                </p>
             </div>
             <div className="p-4 border-t border-border">
                <button 
                  onClick={() => setActiveHelp(null)}
                  className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90 transition-colors uppercase tracking-wide"
                >
                  Entendi
                </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfigCard;
