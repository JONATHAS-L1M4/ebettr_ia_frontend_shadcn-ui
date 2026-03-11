
import React, { useState, useEffect } from 'react';
import { ConfigField, ConfigSection, FieldType } from '../types';
import { Save, ArrowLeft, X, RefreshCw, Loader2 } from './ui/Icons';
import { JsonMapper } from './editor/JsonMapper';
import { ModuleSettings } from './editor/ModuleSettings';
import { FieldForm } from './editor/FieldForm';
import { FieldList } from './editor/FieldList';
import { fetchN8nWorkflowFullJson } from '../services/n8nService';
import { useNotification } from '../context/NotificationContext';

interface ModuleEditorProps {
  onClose: () => void;
  onSave: (newSection: ConfigSection) => void;
  initialData?: ConfigSection | null;
  agentWorkflowId?: string;
}

// Renomeado para ModuleEditor pois não é mais um Modal
export const ModuleEditor: React.FC<ModuleEditorProps> = ({ onClose, onSave, initialData, agentWorkflowId = '' }) => {
  const { addNotification } = useNotification();
  
  // Module State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<ConfigSection['icon']>('settings');
  const [width, setWidth] = useState<'33%' | '66%' | '100%'>('33%');
  
  // Fields State
  const [fields, setFields] = useState<ConfigField[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // Helper State for JSON Mapping
  const [selectedJsonPath, setSelectedJsonPath] = useState('');
  const [selectedJsonType, setSelectedJsonType] = useState<FieldType | null>(null);

  // Workflow Data State (Lifted from JsonMapper)
  const [workflowJsonData, setWorkflowJsonData] = useState<any>(null);
  const [isJsonLoading, setIsJsonLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setIcon(initialData.icon);
      setFields(initialData.fields);
      // Migration fallback:
      const initialWidth = initialData.layoutWidth as any;
      if (initialWidth === '25%') setWidth('33%');
      else if (initialWidth === '50%') setWidth('66%'); // Mapping old 50% to Medium (66%)
      else setWidth(initialWidth || '33%');
    }
  }, [initialData]);

  const handleSyncWorkflow = async () => {
    if (!agentWorkflowId) {
        addNotification('error', 'Workflow Indefinido', 'O ID do workflow não foi encontrado neste agente.');
        return;
    }
    
    setIsJsonLoading(true);
    try {
        const data = await fetchN8nWorkflowFullJson(agentWorkflowId, true);
        setWorkflowJsonData(data);
        addNotification('success', 'Sincronizado', 'Dados do workflow atualizados com sucesso.');
    } catch (e: any) {
        console.error(e);
        addNotification('error', 'Falha na Sincronização', 'Não foi possível buscar o JSON do workflow.');
    } finally {
        setIsJsonLoading(false);
    }
  };

  // Initial Sync on Mount
  useEffect(() => {
      if (agentWorkflowId) {
          // Silent fetch on mount
          const initialFetch = async () => {
              setIsJsonLoading(true);
              try {
                  const data = await fetchN8nWorkflowFullJson(agentWorkflowId);
                  setWorkflowJsonData(data);
              } catch (e) {
                  // Silent fail on init
              } finally {
                  setIsJsonLoading(false);
              }
          };
          initialFetch();
      }
  }, [agentWorkflowId]);

  // Função que executa a gravação de fato
  const executeSave = () => {
    if (!title) return;
    const newSection: ConfigSection = {
      id: initialData ? initialData.id : `section_${Date.now()}`,
      title,
      description,
      icon, 
      fields,
      layoutWidth: width,
      visibleToClient: initialData?.visibleToClient // Preserve visibility
    };
    onSave(newSection);
  };

  const handleSaveField = (field: ConfigField) => {
    if (editingFieldId) {
      setFields(fields.map(f => f.id === editingFieldId ? { ...field, value: f.value } : f));
      setEditingFieldId(null);
    } else {
      setFields([...fields, field]);
    }
    // Limpa a seleção do JSON Mapper após salvar
    setSelectedJsonPath('');
    setSelectedJsonType(null);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (editingFieldId === id) setEditingFieldId(null);
  };

  const handleReorderField = (index: number, direction: 'up' | 'down') => {
      const newFields = [...fields];
      if (direction === 'up' && index > 0) {
          [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
      } else if (direction === 'down' && index < newFields.length - 1) {
          [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      }
      setFields(newFields);
  };

  const handlePreviewChange = (id: string, value: any) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));
  };

  const handleJsonSelect = (path: string, type?: FieldType) => {
    setSelectedJsonPath(path);
    if (type) setSelectedJsonType(type);
  };

  const currentEditingField = editingFieldId ? fields.find(f => f.id === editingFieldId) : null;

  const usedJsonPaths = fields
    .filter(f => f.id !== editingFieldId && f.jsonPath)
    .map(f => f.jsonPath as string);

  return (
    // FULL SCREEN MODE: Fixed inset-0 z-100 para cobrir Sidebar/Header
    <div className="fixed inset-0 z-[100] bg-background text-foreground flex flex-col animate-fade-in font-sans">
      
      <div className="h-16 border-b border-border flex justify-between items-center px-6 shrink-0 bg-card shadow-sm z-10">
        <div className="flex items-center gap-4">
           <button onClick={onClose} className="group flex items-center justify-center w-8 h-8 rounded-full border border-border transition-colors hover:border-muted-foreground/50">
              <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
           </button>
           <div className="flex flex-col">
             <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground leading-none">{initialData ? 'Editar Módulo' : 'Novo Módulo'}</h2>
             </div>
             <p className="text-xs text-muted-foreground mt-1 font-light">Configure a estrutura de dados, mapeamento JSON e campos de entrada.</p>
           </div>
        </div>
        <div className="flex gap-3">
            <button onClick={onClose} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground">Cancelar</button>
            <button 
              onClick={executeSave}
              disabled={!title || fields.length === 0}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Salvar Módulo
            </button>
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr_1fr_1fr] flex-1 overflow-hidden h-full">
        {/* Coluna 1: JSON Source (Mais largo para visualizar payload complexo) */}
        <div className="h-full overflow-hidden border-r border-border flex flex-col bg-muted/30">
            <div className="px-4 py-3 bg-card border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider shadow-sm z-10 flex justify-between items-center">
                <span>Origem de Dados (Payload)</span>
                <button 
                    onClick={handleSyncWorkflow}
                    disabled={isJsonLoading || !agentWorkflowId}
                    className="bg-card border border-border p-1.5 rounded hover:bg-muted hover:border-muted-foreground/50 transition-all text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    title="Sincronizar Workflow"
                >
                    {isJsonLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
            </div>
            <div className="flex-1 overflow-hidden">
                <JsonMapper 
                    onSelectPath={handleJsonSelect} 
                    usedPaths={usedJsonPaths}
                    data={workflowJsonData}
                />
            </div>
        </div>

        {/* Coluna 2: Configuração */}
        <div className="flex flex-col bg-card border-r border-border overflow-y-auto h-full scrollbar-hide shadow-[5px_0_15px_-5px_rgba(0,0,0,0.15)] z-20">
          <div className="px-8 py-10 space-y-8 pb-20">
            <ModuleSettings 
                title={title} setTitle={setTitle}
                description={description} setDescription={setDescription}
                icon={icon} setIcon={setIcon}
                width={width} setWidth={setWidth}
            />
            <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Editor de Campos</h3>
                </div>
                <FieldForm 
                    initialField={currentEditingField}
                    onSave={handleSaveField}
                    onCancelEdit={() => setEditingFieldId(null)}
                    selectedJsonPath={selectedJsonPath}
                    suggestedType={selectedJsonType}
                    parentWidth={width} // Passando a largura do módulo para validação
                    usedJsonPaths={usedJsonPaths}
                />
            </div>
          </div>
        </div>

        {/* Coluna 3: Preview */}
        <div className="h-full overflow-hidden relative flex flex-col bg-muted/30">
            <div className="px-4 py-3 bg-card border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider shadow-sm z-10">
                Visualização do Usuário
            </div>
            <FieldList 
                fields={fields}
                onEdit={(field) => setEditingFieldId(field.id)}
                onRemove={handleRemoveField}
                onReorder={handleReorderField}
                onPreviewChange={handlePreviewChange}
                onAddField={() => setEditingFieldId(null)}
                onImport={(importedFields) => {
                    const existingIds = new Set(fields.map(f => f.id));
                    const idMap = new Map<string, string>();
                    const processedFields: ConfigField[] = [];

                    // 1. Resolve ID conflicts
                    importedFields.forEach(field => {
                        let newId = field.id;
                        // Se o ID já existe, gera um novo para evitar colisão e manter o existente
                        if (existingIds.has(newId)) {
                            const timestamp = Date.now().toString(36);
                            const random = Math.random().toString(36).substring(2, 5);
                            newId = `${field.id}_copy_${timestamp}${random}`;
                            idMap.set(field.id, newId);
                        }
                        processedFields.push({ ...field, id: newId });
                    });

                    // 2. Fix references in conditions
                    const finalFields = processedFields.map(field => {
                        if (field.condition && idMap.has(field.condition.field)) {
                            return {
                                ...field,
                                condition: {
                                    ...field.condition,
                                    field: idMap.get(field.condition.field)!
                                }
                            };
                        }
                        return field;
                    });

                    setFields(prev => [...prev, ...finalFields]);
                    addNotification('success', 'Importado', `${finalFields.length} campos adicionados com sucesso.`);
                }}
                editingFieldId={editingFieldId}
            />
        </div>
      </div>
    </div>
  );
};
