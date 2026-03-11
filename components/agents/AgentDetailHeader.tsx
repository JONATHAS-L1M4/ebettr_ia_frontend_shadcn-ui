import React, { useState, useEffect, useRef } from 'react';
import { Agent } from '../../types';
import { ArrowLeft, Bot, Pencil, Settings, Key, BarChart3, Play, Loader2, RefreshCw, Database } from '../ui/Icons';
import Toggle from '../ui/Toggle';
import { fetchN8nWorkflowFullJson } from '../../services/n8nService';

interface AgentDetailHeaderProps {
  agent: Agent;
  viewMode: 'config' | 'credentials' | 'executions' | 'rag';
  setViewMode: (mode: 'config' | 'credentials' | 'executions' | 'rag') => void;
  isClientMode: boolean;
  isToggling: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onToggleGlobal: (val: boolean) => void;
  onPlayground: () => void;
  showConfigTab?: boolean;
  showCredentialsTab?: boolean;
  isLoading?: boolean;
}

export const AgentDetailHeader: React.FC<AgentDetailHeaderProps> = ({
  agent,
  viewMode,
  setViewMode,
  isClientMode,
  isToggling,
  onBack,
  onEdit,
  onDelete,
  onToggleGlobal,
  onPlayground,
  showConfigTab = true,
  showCredentialsTab = true,
  isLoading = false
}) => {
  const hasTestMode = agent.hasTestMode !== undefined ? agent.hasTestMode : true;
  const isBlocked = agent.isBlocked;

  // Status remoto apenas para o indicador visual (ponto), nao para o controle do switch
  const [remoteActive, setRemoteActive] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const isMounted = useRef(false);

  const getWorkflowId = () => {
    if (agent.workflowId) return agent.workflowId;
    return agent.configSections
      .flatMap((section) => section.fields)
      .find((field) => field.id === 'n8n_workflow_id')?.value as string;
  };

  const workflowId = getWorkflowId();

  useEffect(() => {
    if (!workflowId || isBlocked) return;

    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const verifyStatus = async () => {
      if (!mounted) return;
      setIsVerifying(true);

      try {
        const data = await fetchN8nWorkflowFullJson(workflowId);
        if (mounted && data && typeof data.active === 'boolean') {
          setRemoteActive(data.active);
        }
      } catch (error) {
        console.warn('[Header] Falha ao verificar status remoto');
      } finally {
        if (mounted) setIsVerifying(false);
      }
    };

    if (!isMounted.current) {
      verifyStatus();
      isMounted.current = true;
    } else {
      // Delay para ignorar checagem remota logo apos o toggle e evitar conflito
      timeoutId = setTimeout(verifyStatus, 4000);
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [agent.id, workflowId, isBlocked, agent.active]);

  // O ponto de status usa o remoto se disponivel, mas o texto e toggle usam o local para estabilidade
  const statusIndicatorActive = remoteActive !== null ? remoteActive : agent.active;
  const statusStyles = isBlocked
    ? {
        dot: 'bg-red-400',
        text: 'text-red-300',
        label: 'Bloqueado'
      }
    : agent.maintenance
      ? {
          dot: 'bg-amber-400',
          text: 'text-amber-300',
          label: 'Manutencao'
        }
      : statusIndicatorActive
        ? {
            dot: 'bg-emerald-400',
            text: 'text-emerald-300',
            label: 'Ativado'
          }
        : {
            dot: 'bg-zinc-500',
            text: 'text-zinc-400',
            label: 'Desativado'
          };

  const showNavigation = true;
  const getTabClass = (isActive: boolean) =>
    [
      'flex-1 sm:flex-none flex h-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-200 ease-out',
      isActive
        ? 'bg-[#2e2e2e] text-foreground shadow-[0_8px_24px_-16px_rgba(0,0,0,0.9)]'
        : 'text-muted-foreground hover:bg-card/85 hover:text-foreground'
    ].join(' ');

  return (
    <div className="flex flex-col justify-between gap-6 border-b border-border pb-4 lg:flex-row lg:items-center">
      {/* Left: Back & Title */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          onClick={onBack}
          className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:border-ring/40"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
        </button>

        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
            <Bot className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold text-foreground" title={agent.name}>
                {agent.name}
              </h1>

              {!isClientMode && onEdit && (
                <button
                  onClick={onEdit}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Editar Dados e Workflow"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2">
              {isBlocked ? (
                <>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-widest ${statusStyles.text}`}>
                    {statusStyles.label}
                  </span>
                </>
              ) : agent.maintenance ? (
                <>
                  <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${statusStyles.dot}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-widest ${statusStyles.text}`}>
                    {statusStyles.label}
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-widest ${statusStyles.text}`}>
                    {statusStyles.label}
                  </span>
                  {isVerifying && <RefreshCw className="h-2.5 w-2.5 animate-spin text-muted-foreground/70" />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex w-full shrink-0 flex-col items-stretch gap-4 sm:flex-row sm:items-center lg:w-auto">
        {/* Toggle View (Tabs) */}
        {showNavigation && (
          <div className="flex h-[36px] w-full items-center gap-2 rounded-lg border border-border bg-muted/60 p-1 shadow-inner sm:w-auto">
            {isLoading ? (
              <div className="flex w-full animate-pulse items-center gap-2 px-1">
                <div className="h-6 w-20 rounded-md bg-muted" />
                <div className="h-6 w-24 rounded-md bg-muted" />
                <div className="h-6 w-20 rounded-md bg-muted" />
              </div>
            ) : (
              <>
                {agent.ragEnabled !== false && (
                  <button onClick={() => setViewMode('rag')} className={getTabClass(viewMode === 'rag')}>
                    <Database className="h-3.5 w-3.5" />
                    Rag
                  </button>
                )}

                {showConfigTab && (
                  <button onClick={() => setViewMode('config')} className={getTabClass(viewMode === 'config')}>
                    <Settings className="h-3.5 w-3.5" />
                    Config
                  </button>
                )}

                {showCredentialsTab && (
                  <button onClick={() => setViewMode('credentials')} className={getTabClass(viewMode === 'credentials')}>
                    <Key className="h-3.5 w-3.5" />
                    Credenciais
                  </button>
                )}

                <button onClick={() => setViewMode('executions')} className={getTabClass(viewMode === 'executions')}>
                  <BarChart3 className="h-3.5 w-3.5" />
                  Execucoes
                </button>
              </>
            )}
          </div>
        )}

        {showNavigation && <div className="mx-1.5 hidden h-6 w-[1px] bg-border lg:block" />}

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div
            className={`flex h-[36px] w-full items-center justify-between gap-2 rounded-lg bg-muted/50 px-4 py-2 shadow-inner sm:w-auto sm:flex-none sm:justify-start ${
              isToggling || isBlocked || agent.maintenance ? 'cursor-not-allowed opacity-50' : ''
            }`}
            title={
              isBlocked
                ? 'Agente bloqueado. Desbloqueie na lista principal.'
                : agent.maintenance
                  ? 'Agente em manutencao.'
                  : ''
            }
          >
            <span className={`min-w-[80px] text-center text-xs font-medium uppercase tracking-wide ${agent.active ? 'text-foreground' : 'text-muted-foreground'}`}>
              {isToggling ? 'Aguarde...' : isBlocked ? 'Bloqueado' : agent.maintenance ? 'Manutencao' : 'Workflow'}
            </span>
            <div className={isToggling || isBlocked || agent.maintenance ? 'pointer-events-none' : ''}>
              {isToggling ? (
                <Loader2 className="h-5 w-5 animate-spin text-foreground" />
              ) : (
                <Toggle checked={agent.active} onChange={onToggleGlobal} size="sm" />
              )}
            </div>
          </div>

          {hasTestMode && !isBlocked && (
            <button
              onClick={onPlayground}
              className="flex h-[32px] flex-1 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary/90 sm:flex-none"
            >
              <Play className="h-3 w-3" />
              Testar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
