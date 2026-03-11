import React, { useEffect, useRef, useState } from 'react';
import { Agent, UserRole } from '../../types';
import { Bot, Loader2, AlertTriangle, Lock, LockOpen, Ban, RefreshCw } from '../ui/Icons';
import Toggle from '../ui/Toggle';
import SpotlightCard from '../ui/SpotlightCard';
import { useNotification } from '../../context/NotificationContext';
import { fetchN8nWorkflowFullJson } from '../../services/n8nService';

interface AgentCardProps {
  agent: Agent;
  isToggling: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  readonly?: boolean;
  userRole?: UserRole | null;
  onBlockToggle?: (blocked: boolean) => void;
  onMaintenanceToggle?: (id: string, maintenance: boolean) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  isToggling,
  onSelect,
  onToggle,
  readonly = false,
  userRole,
  onBlockToggle,
  onMaintenanceToggle
}) => {
  const { addNotification } = useNotification();

  const [remoteActive, setRemoteActive] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  const getWorkflowId = () => {
    return agent.configSections
      .flatMap((section) => section.fields)
      .find((field) => field.id === 'n8n_workflow_id')?.value as string;
  };

  const workflowId = getWorkflowId();
  const isAdmin = userRole === 'admin';
  const isBlocked = agent.isBlocked;
  const isToggleDisabled = readonly || isBlocked || agent.maintenance || isToggling;

  useEffect(() => {
    if (!workflowId || isBlocked) return;

    let mounted = true;

    const verifyStatus = async () => {
      if (Date.now() - lastUpdateRef.current < 3000) return;

      setIsVerifying(true);
      try {
        const data = await fetchN8nWorkflowFullJson(workflowId);
        if (mounted && data && typeof data.active === 'boolean') {
          setRemoteActive(data.active);
        }
      } catch (error) {
        console.warn(`[AgentCard] Falha ao verificar status remoto para ${agent.name}`);
      } finally {
        if (mounted) setIsVerifying(false);
      }
    };

    verifyStatus();
    const intervalId = setInterval(verifyStatus, 30000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [workflowId, isBlocked]);

  const statusIndicatorActive = remoteActive !== null ? remoteActive : agent.active;
  const blockedCardClass = 'border-red-500/35 bg-red-500/[0.08] hover:bg-red-500/[0.12]';
  const maintenanceCardClass = 'border-amber-500/35 bg-amber-500/[0.08] hover:bg-amber-500/[0.12]';

  const handleToggleClick = (val: boolean) => {
    lastUpdateRef.current = Date.now();
    setRemoteActive(null);
    onToggle(agent.id, val);
  };

  const handleBlockClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onBlockToggle) {
      onBlockToggle(!isBlocked);
    }
  };

  const handleCardClick = () => {
    if (isBlocked && !isAdmin) {
      addNotification(
        'warning',
        'Agente Indisponivel',
        'O acesso a este agente foi suspenso. Por favor, entre em contato com o administrador do sistema.'
      );
      return;
    }

    onSelect(agent.id);
  };

  return (
    <SpotlightCard
      onClick={handleCardClick}
      className={`
        group relative h-full min-h-[200px] cursor-pointer overflow-hidden
        ${isBlocked || agent.maintenance ? 'transition-none' : ''}
        ${
          isBlocked
            ? blockedCardClass
            : agent.maintenance
              ? maintenanceCardClass
              : !agent.active
                ? 'border-border opacity-75 hover:opacity-100'
                : 'border-border hover:border-border'
        }
      `}
    >
      {(isBlocked || agent.maintenance) && (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.03] text-foreground/40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)',
            backgroundSize: '10px 10px'
          }}
        />
      )}

      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        <div className="mb-3 flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg border ${isBlocked || agent.maintenance ? '' : 'transition-colors'} ${
              isBlocked
                ? 'border-red-500/35 bg-red-500/12 text-red-300'
                : agent.maintenance
                  ? 'border-amber-500/35 bg-amber-500/12 text-amber-300'
                  : 'border-border bg-muted text-foreground'
            }`}
          >
            {isBlocked ? (
              isAdmin ? <Lock className="h-5 w-5" /> : <Ban className="h-5 w-5" />
            ) : agent.maintenance ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Bot className={`h-5 w-5 transition-colors ${agent.active ? 'text-foreground' : 'text-muted-foreground'}`} />
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onMaintenanceToggle) onMaintenanceToggle(agent.id, !agent.maintenance);
                  }}
                  className={`z-30 rounded-md p-1.5 ${agent.maintenance ? '' : 'transition-colors'} ${
                    agent.maintenance
                      ? 'border border-amber-500/30 bg-amber-500/12 text-amber-300'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  title={agent.maintenance ? 'Sair do Modo Manutencao' : 'Entrar em Modo Manutencao'}
                >
                  <AlertTriangle className="h-4 w-4" />
                </button>

                <button
                  onClick={handleBlockClick}
                  className={`z-30 rounded-md p-1.5 ${isBlocked ? '' : 'transition-colors'} ${
                    isBlocked
                      ? 'border border-red-500/30 bg-red-500/12 text-red-300 hover:bg-red-500/16'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  title={isBlocked ? 'Desbloquear Agente' : 'Bloquear Agente (Admin)'}
                >
                  {isBlocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                </button>
              </div>
            )}

            <div onClick={(event) => event.stopPropagation()} className="relative z-20">
              {isBlocked && !isAdmin ? (
                <div
                  className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/12 px-2 py-1 text-red-300"
                  title="Contate o administrador"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide">Indisponivel</span>
                </div>
              ) : agent.maintenance && !isAdmin ? (
                <div
                  className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/12 px-2 py-1 text-amber-300"
                  title="Agente em manutencao"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide">Manutencao</span>
                </div>
              ) : isToggling ? (
                <div className="p-1">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Toggle checked={agent.active} onChange={handleToggleClick} size="sm" disabled={isToggleDisabled} />
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-1 flex-col justify-start">
          <div className="mb-1 flex items-center gap-2">
            <h3 className={`truncate text-sm font-bold tracking-tight ${agent.active && !isBlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
              {agent.name}
            </h3>
            {!workflowId && !isBlocked && (
              <span className="text-muted-foreground" title="Workflow nao configurado">
                <AlertTriangle className="h-3 w-3" />
              </span>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {isBlocked && !isAdmin
              ? 'Este agente esta temporariamente fora de operacao.'
              : agent.maintenance && !isAdmin
                ? 'Este agente esta em manutencao no momento.'
                : agent.description || 'Sem descricao.'}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          {isBlocked ? (
            <div className="flex items-center gap-1.5 text-red-300">
              <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {isAdmin ? 'Bloqueado Admin' : 'Suspenso'}
              </span>
            </div>
          ) : agent.maintenance ? (
            <div className="flex items-center gap-1.5 text-amber-300">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Manutencao</span>
            </div>
          ) : (
            <div className="flex w-full items-center gap-2">
              {agent.active ? (
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${statusIndicatorActive ? 'bg-foreground' : 'bg-muted-foreground/80'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operacional</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Standby</span>
                </div>
              )}

              {isVerifying && (
                <div className="ml-auto" title="Sincronizando com n8n...">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
};
