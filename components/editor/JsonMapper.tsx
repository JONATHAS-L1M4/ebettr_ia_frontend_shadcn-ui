import React, { useEffect, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Lock,
  AlertCircle,
  Box,
  ChevronRight,
  Code,
  CircleHelp,
  Info,
  X,
} from '../ui/Icons';
import { FieldType } from '../../types';

interface JsonMapperProps {
  onSelectPath: (path: string, type?: FieldType) => void;
  usedPaths?: string[];
  data: any;
}

// Helper para inferir o tipo do campo
const inferFieldType = (value: any): FieldType => {
  if (typeof value === 'boolean') return 'switch';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'number_int' : 'number_dec';
  }
  if (Array.isArray(value)) return 'multiselect';
  if (typeof value === 'string') {
    if (value.includes('@') && value.includes('.')) return 'email';
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return 'url';
    }
    if (value.length > 100) return 'textarea';
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) return 'uuid';
    return 'text';
  }
  return 'text';
};

// Filtra e prepara o JSON
const filterWorkflowDisplay = (data: any) => {
  if (!data || !data.nodes || !Array.isArray(data.nodes)) return { nodes: [] };

  // Retorna array mantendo índices originais, mas com valores null onde não interessa
  const sparseNodes: any[] = [];

  data.nodes.forEach((node: any, index: number) => {
    if (node.notesInFlow === true) {
      sparseNodes[index] = {
        name: node.name,
        type: node.type,
        disabled: node.disabled !== undefined ? node.disabled : false,
        parameters: node.parameters || {},
        notes: node.notes || '',
      };
    }
  });

  return { nodes: sparseNodes };
};

interface ParameterRowProps {
  label: string;
  value: any;
  path: string;
  onSelect: (path: string, type?: FieldType) => void;
  isUsed: boolean;
  level?: number;
}

const ParameterRow: React.FC<ParameterRowProps> = ({
  label,
  value,
  path,
  onSelect,
  isUsed,
  level = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isArray = Array.isArray(value);
  const isObject = typeof value === 'object' && value !== null && !isArray;
  const isExpandable = isObject || isArray;

  // Se for objeto/array e estiver vazio, não renderiza nada
  if (
    isExpandable &&
    (isArray ? value.length === 0 : Object.keys(value).length === 0)
  ) {
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

  let displayValue = '';
  if (isObject) {
    displayValue = '';
  } else if (isArray) {
    displayValue = isExpanded ? '' : `[ ${value.length} itens ]`;
  } else if (typeof value === 'boolean') {
    displayValue = value ? 'true' : 'false';
  } else {
    displayValue = String(value);
  }

  if (displayValue && displayValue.length > 30) {
    displayValue = `${displayValue.substring(0, 30)}...`;
  }

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        className={`
          mb-0.5 flex items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-xs transition-all
          ${level > 0 ? 'ml-3 rounded-l-none border-l-2 border-l-border pl-2' : ''}
          ${
            isUsed
              ? 'cursor-not-allowed bg-muted/40 opacity-50'
              : isExpandable
                ? 'cursor-pointer font-semibold text-foreground hover:bg-muted/40'
                : 'cursor-pointer hover:border-border hover:bg-accent hover:text-foreground hover:shadow-sm'
          }
        `}
        title={path}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {isExpandable && (
            <div
              className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            >
              <ChevronRight className="h-3 w-3" />
            </div>
          )}

          <span
            className={`truncate font-mono ${isUsed ? 'line-through text-muted-foreground' : 'text-foreground'} ${isExpandable ? 'text-[11px]' : 'font-medium'}`}
          >
            {label}
          </span>

          {!isExpandable && (
            <span className="text-muted-foreground/70">:</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {displayValue && (
            <span
              className={`max-w-[120px] truncate font-mono text-[10px] ${isUsed ? 'text-muted-foreground/70' : 'text-muted-foreground'} ${typeof value === 'boolean' ? (value ? 'text-foreground' : 'text-rose-700') : ''}`}
            >
              {displayValue}
            </span>
          )}
          {isUsed && <Lock className="h-3 w-3 text-muted-foreground/70" />}
        </div>
      </div>

      {isExpandable && isExpanded && (
        <div className="ml-2 border-l border-border pl-1">
          {Object.entries(value).map(([key, val]) => {
            const isNumericKey = /^\d+$/.test(key);
            const safeKey = isNumericKey
              ? `[${key}]`
              : /^[a-zA-Z0-9_]+$/.test(key)
                ? key
                : `"${key}"`;

            const nextPath = isNumericKey
              ? `${path}${safeKey}`
              : `${path}.${safeKey}`;

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
  data,
}) => {
  const [parsedJson, setParsedJson] = useState<any>(null);

  useEffect(() => {
    const filtered = filterWorkflowDisplay(data);
    setParsedJson(filtered);
  }, [data]);

  return (
    <div className="relative flex h-full flex-col bg-muted/30">
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {!parsedJson || !data ? (
          <div className="mt-10 flex h-full flex-col items-center justify-center text-center">
            <div className="text-muted-foreground">
              <Box className="mx-auto mb-2 h-10 w-10 opacity-20" />
              <p className="text-xs font-medium text-muted-foreground">
                Aguardando dados...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {parsedJson.nodes.map((node: any, index: number) => {
              if (!node) return null;

              const hasParams = Object.keys(node.parameters).length > 0;

              return (
                <div
                  key={index}
                  className="group rounded-lg border border-border bg-panel shadow-sm transition-colors hover:border-border/80 animate-fade-in"
                >
                  <div className="flex items-center justify-between rounded-t-lg border-b border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded border border-border bg-card text-muted-foreground shadow-sm">
                        <Code className="h-3 w-3" />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold leading-none text-foreground">
                            {node.name || `Node ${index}`}
                          </span>

                          {node.notes && (
                            <Dialog.Root>
                              <Tooltip.Provider delayDuration={200}>
                                <Tooltip.Root>
                                  <Tooltip.Trigger asChild>
                                    <Dialog.Trigger asChild>
                                      <button className="flex items-center rounded-full outline-none transition-colors">
                                        <CircleHelp className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                                      </button>
                                    </Dialog.Trigger>
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      sideOffset={8}
                                      className="z-[9999] w-max max-w-[200px] rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md animate-in fade-in zoom-in-95"
                                    >
                                      Clique para ver detalhes
                                      <Tooltip.Arrow className="fill-popover" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              </Tooltip.Provider>

                              <Dialog.Portal>
                                <Dialog.Overlay className="fixed inset-0 z-[10000] bg-background/68 backdrop-blur-[1.5px]" />
                                <Dialog.Content className="fixed left-1/2 top-1/2 z-[10001] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-[#101010] shadow-2xl">
                                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
                                        <Info className="h-4 w-4 text-foreground" />
                                      </div>
                                      <div>
                                        <h3 className="text-sm font-semibold text-foreground">
                                          Detalhes do Campo
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                          {node.name || 'Sem nome'}
                                        </p>
                                      </div>
                                    </div>

                                    <Dialog.Close asChild>
                                      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                                        <X className="h-4 w-4" />
                                      </button>
                                    </Dialog.Close>
                                  </div>

                                  <div className="p-5">
                                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                        {node.notes}
                                      </p>
                                    </div>

                                    <div className="mt-5 flex justify-end">
                                      <Dialog.Close asChild>
                                        <button className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40">
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

                        <span className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                          {node.type?.split('.').pop()}
                        </span>
                      </div>
                    </div>

                    <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground">
                      #{index}
                    </span>
                  </div>

                  <div className="p-3">
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
                        <p className="text-[10px] italic text-muted-foreground">
                          Sem parâmetros visíveis.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {parsedJson.nodes.length === 0 && (
              <div className="py-10 text-center">
                <div className="inline-block max-w-[250px] rounded-lg border border-border bg-muted/40 p-4 text-left">
                  <p className="mb-1 flex items-center gap-1 text-xs font-bold text-muted-foreground">
                    <AlertCircle className="h-3 w-3" /> Atenção
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Nenhum nó marcado com <strong>"Notes In Flow"</strong> foi
                    encontrado no workflow.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
