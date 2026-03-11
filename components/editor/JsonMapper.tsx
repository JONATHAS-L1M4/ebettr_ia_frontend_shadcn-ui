
import React, { useState, useEffect } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Dialog from '@radix-ui/react-dialog';
import { Lock, AlertCircle, Box, ChevronRight, Code, CircleHelp, Info, X } from '../ui/Icons';
import { FieldType } from '../../types';

interface JsonMapperProps {
  onSelectPath: (path: string, type?: FieldType) => void;
  usedPaths?: string[];
  data: any; // Recebe dados brutos do pai
}

// Helper para inferir o tipo do campo
const inferFieldType = (value: any): FieldType => {
  if (typeof value === 'boolean') return 'switch';
  if (typeof value === 'number') return Number.isInteger(value) ? 'number_int' : 'number_dec';
  if (Array.isArray(value)) return 'multiselect';
  if (typeof value === 'string') {
    if (value.includes('@') && value.includes('.')) return 'email';
    if (value.startsWith('http://') || value.startsWith('https://')) return 'url';
    if (value.length > 100) return 'textarea';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) return 'uuid';
    return 'text';
  }
  return 'text';
};

// Filtra e prepara o JSON
const filterWorkflowDisplay = (data: any) => {
  if (!data || !data.nodes || !Array.isArray(data.nodes)) return { nodes: [] };

  // Retorna array mantendo Ã­ndices originais mas com valores null onde nÃ£o interessa
  const sparseNodes: any[] = [];
  
  data.nodes.forEach((node: any, index: number) => {
    if (node.notesInFlow === true) {
      sparseNodes[index] = {
        name: node.name, // MantÃ©m o nome do nÃ³ para exibiÃ§Ã£o no tÃ­tulo
        type: node.type,
        disabled: node.disabled !== undefined ? node.disabled : false, // Default false se nÃ£o existir
        parameters: node.parameters || {},
        notes: node.notes || ''
      };
    }
  });

  return { nodes: sparseNodes };
};

// --- COMPONENTES VISUAIS ---

interface ParameterRowProps {
    label: string;
    value: any;
    path: string;
    onSelect: (path: string, type?: FieldType) => void;
    isUsed: boolean;
    level?: number;
}

const ParameterRow: React.FC<ParameterRowProps> = ({ label, value, path, onSelect, isUsed, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isArray = Array.isArray(value);
    const isObject = typeof value === 'object' && value !== null && !isArray;
    const isExpandable = isObject || isArray;
    
    // REGRA DE LIMPEZA: Se for objeto/array e estiver vazio, nÃ£o renderiza nada (oculta do card)
    if (isExpandable && (isArray ? value.length === 0 : Object.keys(value).length === 0)) {
        return null;
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isExpandable) {
            setIsExpanded(!isExpanded);
        } else if (!isUsed) {
            onSelect(path, inferFieldType(value));
        }
    };

    // Valor para exibiÃ§Ã£o
    let displayValue = '';
    if (isObject) {
        // Se for objeto, nÃ£o mostra nada (apenas expande)
        displayValue = ''; 
    }
    else if (isArray) {
        displayValue = isExpanded ? '' : `[ ${value.length} itens ]`;
    }
    else if (typeof value === 'boolean') {
        displayValue = value ? 'true' : 'false';
    }
    else displayValue = String(value);

    // Truncate long strings
    if (displayValue && displayValue.length > 30) displayValue = displayValue.substring(0, 30) + '...';

    return (
        <div className="select-none">
            <div 
                onClick={handleClick}
                className={`
                    flex items-center justify-between py-1.5 px-2 rounded-md text-xs border border-transparent transition-all mb-0.5
                    ${level > 0 ? 'ml-3 border-l-2 border-l-border rounded-l-none pl-2' : ''}
                    ${isUsed 
                        ? 'opacity-50 cursor-not-allowed bg-muted/40' 
                        : isExpandable 
                            ? 'cursor-pointer hover:bg-muted/40 text-foreground font-semibold'
                            : 'cursor-pointer hover:bg-accent hover:border-border hover:text-foreground hover:shadow-sm'
                    }
                `}
                title={path}
            >
                <div className="flex items-center gap-1.5 overflow-hidden">
                    {isExpandable && (
                        <div className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                            <ChevronRight className="w-3 h-3" />
                        </div>
                    )}
                    <span className={`font-mono truncate ${isUsed ? 'line-through text-muted-foreground' : 'text-foreground'} ${isExpandable ? 'text-[11px]' : 'font-medium'}`}>
                        {label}
                    </span>
                    {!isExpandable && <span className="text-muted-foreground/70">:</span>}
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                    {displayValue && (
                        <span className={`font-mono text-[10px] truncate max-w-[120px] ${isUsed ? 'text-muted-foreground/70' : 'text-muted-foreground'} ${typeof value === 'boolean' ? (value ? 'text-foreground' : 'text-rose-700') : ''}`}>
                            {displayValue}
                        </span>
                    )}
                    {isUsed && <Lock className="w-3 h-3 text-muted-foreground/70" />}
                </div>
            </div>

            {/* RecursÃ£o para objetos ou arrays aninhados */}
            {isExpandable && isExpanded && (
                <div className="border-l border-border ml-2 pl-1">
                    {Object.entries(value).map(([key, val]) => {
                        const isNumericKey = /^\d+$/.test(key);
                        const safeKey = isNumericKey ? `[${key}]` : (/^[a-zA-Z0-9_]+$/.test(key) ? key : `"${key}"`);
                        
                        // Ajusta o path para arrays: $.nodes[0].parameters.items[0]
                        const nextPath = isNumericKey ? `${path}${safeKey}` : `${path}.${safeKey}`;
                        
                        return (
                            <ParameterRow 
                                key={key}
                                label={isNumericKey ? `Item ${key}` : key}
                                value={val}
                                path={nextPath}
                                onSelect={onSelect}
                                isUsed={isUsed}
                                level={level + 1}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const JsonMapper: React.FC<JsonMapperProps> = ({ 
  onSelectPath, 
  usedPaths = [], 
  data
}) => {
  const [parsedJson, setParsedJson] = useState<any>(null);

  useEffect(() => {
      const filtered = filterWorkflowDisplay(data);
      setParsedJson(filtered); 
  }, [data]);

  return (
    <div className="h-full flex flex-col bg-muted/30 relative">
        {/* Header Removido conforme solicitado - Controles movidos para o pai (AddModuleModal) */}

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            
            {/* Estado Vazio / Erro */}
            {!parsedJson || !data ? (
                <div className="flex flex-col h-full items-center justify-center text-center mt-10">
                    <div className="text-muted-foreground">
                        <Box className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-medium text-muted-foreground">Aguardando dados...</p>
                    </div>
                </div>
            ) : (
                /* Grid de Cards */
                <div className="flex flex-col gap-4">
                    {parsedJson.nodes.map((node: any, index: number) => {
                        // Sparse array check
                        if (!node) return null;

                        const hasParams = Object.keys(node.parameters).length > 0;

                        return (
                            <div key={index} className="bg-panel border border-border rounded-lg shadow-sm animate-fade-in group transition-colors hover:border-border/80">
                                {/* Card Header - Simple & Clean Style (Editor de Campos style) */}
                                <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30 rounded-t-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-card border border-border rounded flex items-center justify-center text-muted-foreground shadow-sm">
                                            <Code className="w-3 h-3" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-foreground leading-none">
                                                    {node.name || `Node ${index}`}
                                                </span>
                                                {node.notes && (
                                                    <Dialog.Root>
                                                        <Tooltip.Provider delayDuration={200}>
                                                            <Tooltip.Root>
                                                                <Tooltip.Trigger asChild>
                                                                    <Dialog.Trigger asChild>
                                                                        <button className="flex items-center outline-none rounded-full transition-colors">
                                                                            <CircleHelp className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                                                                        </button>
                                                                    </Dialog.Trigger>
                                                                </Tooltip.Trigger>
                                                                <Tooltip.Portal>
                                                                    <Tooltip.Content 
                                                                        sideOffset={8} 
                                                                        className="w-max max-w-[200px] bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md z-[9999] animate-in fade-in zoom-in-95"
                                                                    >
                                                                        Clique para ver detalhes
                                                                        <Tooltip.Arrow className="fill-popover" />
                                                                    </Tooltip.Content>
                                                                </Tooltip.Portal>
                                                            </Tooltip.Root>
                                                        </Tooltip.Provider>

                                                        <Dialog.Portal>
                                                            <Dialog.Overlay className="fixed inset-0 bg-background/80  z-[10000]" />
                                                            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-xl shadow-xl z-[10001] overflow-hidden border border-border">
                                                                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center">
                                                                            <Info className="w-4 h-4 text-foreground" />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-sm font-semibold text-foreground">Detalhes do Campo</h3>
                                                                            <p className="text-xs text-muted-foreground">{node.name || 'Sem nome'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <Dialog.Close asChild>
                                                                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </Dialog.Close>
                                                                </div>
                                                                <div className="p-5">
                                                                    <div className="bg-muted/40 rounded-lg p-4 border border-border">
                                                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                                                            {node.notes}
                                                                        </p>
                                                                    </div>
                                                                    <div className="mt-5 flex justify-end">
                                                                        <Dialog.Close asChild>
                                                                            <button className="px-4 py-2 bg-card border border-border hover:bg-muted/40 text-foreground text-sm font-medium rounded-lg transition-colors">
                                                                                Entendi
                                                                            </button>
                                                                        </Dialog.Close>
                                                                    </div>
                                                                </div>
                                                            </Dialog.Content>
                                                        </Dialog.Portal>
                                                    </Dialog.Root>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                                                {node.type?.split('.').pop()}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-mono font-medium text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded">
                                        #{index}
                                    </span>
                                </div>

                                {/* Card Body: Parameters */}
                                <div className="p-3">
                                    {/* Root Properties (like disabled) */}
                                    <div className="mb-2 pb-2">
                                        <ParameterRow 
                                            label="disabled"
                                            value={node.disabled}
                                            path={`$.nodes[${index}].disabled`}
                                            onSelect={onSelectPath}
                                            isUsed={usedPaths.includes(`$.nodes[${index}].disabled`)}
                                        />
                                    </div>

                                    {hasParams ? (
                                        <div className="flex flex-col gap-0.5">
                                            {Object.entries(node.parameters).map(([key, val]) => {
                                                const path = `$.nodes[${index}].parameters.${key}`;
                                                const isUsed = usedPaths.includes(path);
                                                
                                                return (
                                                    <ParameterRow 
                                                        key={key}
                                                        label={key}
                                                        value={val}
                                                        path={path}
                                                        onSelect={onSelectPath}
                                                        isUsed={isUsed}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-2 text-center">
                                            <p className="text-[10px] text-muted-foreground italic">Sem parÃ¢metros visÃ­veis.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {parsedJson.nodes.length === 0 && (
                        <div className="text-center py-10">
                            <div className="bg-muted/40 border border-border p-4 rounded-lg inline-block text-left max-w-[250px]">
                                <p className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> AtenÃ§Ã£o</p>
                                <p className="text-[10px] text-muted-foreground">Nenhum nÃ³ marcado com <strong>"Notes In Flow"</strong> foi encontrado no workflow.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

