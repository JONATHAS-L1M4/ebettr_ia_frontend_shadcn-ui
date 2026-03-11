import React, { useEffect, useRef, useState } from 'react';
import { ConfigField } from '../../types';
import { fetchN8nWorkflows, N8nWorkflow } from '../../services/n8nService';
import { Search, Loader2, AlertCircle, X, Zap, RefreshCw } from '../ui/Icons';
import { inputBaseClass } from './styles';

interface WorkflowSearchFieldProps {
  field: ConfigField;
  onChange: (value: string) => void;
  onSelectWorkflow: (workflow: N8nWorkflow) => void;
}

export const WorkflowSearchField: React.FC<WorkflowSearchFieldProps> = ({
  field,
  onChange,
  onSelectWorkflow
}) => {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadWorkflows = async (force = false) => {
    if (!force && workflows.length > 0) return;

    setLoading(true);
    setError(false);

    try {
      const data = await fetchN8nWorkflows(force);
      setWorkflows(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    setShowDropdown(true);
    loadWorkflows();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
    setShowDropdown(true);
  };

  const handleManualRefresh = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    loadWorkflows(true);
  };

  const filteredWorkflows = workflows.filter((workflow) => {
    const term = String(field.value || '').toLowerCase();
    const name = String(workflow.name || '').toLowerCase();
    const id = String(workflow.id || '').toLowerCase();
    return name.includes(term) || id.includes(term);
  });

  const handleSelect = (workflow: N8nWorkflow) => {
    onChange(workflow.name);
    onSelectWorkflow(workflow);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    onChange('');
    setShowDropdown(true);
  };

  const matchedWorkflow = field.value
    ? workflows.find((workflow) => workflow.name === field.value)
    : null;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={(field.value as string) || ''}
          onChange={handleInputChange}
          onFocus={handleFocus}
          className={`${inputBaseClass} pr-16 ${field.value ? 'font-semibold text-foreground' : ''}`}
          placeholder="Buscar por nome ou ID..."
        />

        <div className="absolute right-2 top-2 flex items-center gap-1 text-muted-foreground">
          <button
            type="button"
            onClick={handleManualRefresh}
            className={`rounded p-1 transition-colors hover:bg-accent hover:text-foreground ${loading ? 'animate-spin text-foreground' : ''}`}
            title="Escanear workflows"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>

          <div className="mx-1 h-4 w-[1px] bg-border" />

          {field.value ? (
            <button onClick={clearSelection} type="button" className="rounded p-1 transition-colors hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="p-1">
              <Search className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {showDropdown && (
        <div className="z-50 mt-1 max-h-60 w-full animate-scale-in overflow-y-auto rounded-lg border border-border bg-popover shadow-sm">
          {loading && workflows.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">Carregando workflows...</div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 p-3 text-center text-xs text-destructive">
              <AlertCircle className="h-3 w-3" /> Erro ao carregar.
              <button onClick={() => loadWorkflows(true)} className="underline hover:opacity-80">
                Tentar
              </button>
            </div>
          )}

          {!loading && !error && filteredWorkflows.length === 0 && (
            <div className="p-3 text-center text-xs text-muted-foreground">Nenhum workflow encontrado.</div>
          )}

          {!loading &&
            filteredWorkflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => handleSelect(workflow)}
                type="button"
                className="group flex w-full items-center justify-between border-b border-border/60 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-accent/30"
              >
                <div className="flex min-w-0 flex-col pr-3">
                  <span className="truncate text-sm font-medium text-foreground">{workflow.name}</span>
                  <span className="truncate font-mono text-[9px] text-muted-foreground">#{workflow.id}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {workflow.active ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Ativo
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Desativado
                    </span>
                  )}
                </div>
              </button>
            ))}
        </div>
      )}

      {matchedWorkflow && (
        <div className="mt-2 flex animate-fade-in items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm">
              <Zap className="h-4 w-4" />
            </div>

            <div>
              <h4 className="text-xs font-bold text-foreground">{matchedWorkflow.name}</h4>
              <span className="rounded border border-border bg-card px-1 font-mono text-[10px] text-muted-foreground">
                {matchedWorkflow.id}
              </span>
            </div>
          </div>

          {matchedWorkflow.active ? (
            <div className="flex items-center gap-1 text-emerald-400">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold uppercase">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              <span className="text-[10px] font-bold uppercase">Desativado</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
