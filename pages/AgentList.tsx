
import React, { useState } from 'react';
import { Agent, UserRole } from '../types';
import { Plus, Bot, Search } from '../components/ui/Icons';
import { useNotification } from '../context/NotificationContext';
import { toggleN8nWorkflow } from '../services/n8nService';
import { AgentForm } from '../components/agents/AgentForm';
import { AgentCard } from '../components/agents/AgentCard';
import { CreateAgentCard } from '../components/agents/CreateAgentCard';
import DarkPage from '../components/layout/DarkPage';

interface AgentListProps {
  agents: Agent[];
  onSelectAgent: (id: string) => void;
  onToggleAgent: (id: string, active: boolean) => void;
  onBlockAgent: (id: string, isBlocked: boolean) => void; 
  onMaintenanceAgent: (id: string, maintenance: boolean) => void;
  onCreateAgent?: (agent: Agent) => Promise<void> | void; // Allow async
  userRole: UserRole | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
}

const AgentCardSkeleton = () => (
  <div className="h-full min-h-[200px] border border-border rounded-xl bg-card p-6 flex flex-col justify-between animate-pulse">
    <div className="flex justify-between items-start mb-3">
        <div className="w-10 h-10 bg-muted rounded-lg"></div>
        <div className="w-8 h-5 bg-muted rounded-full"></div>
    </div>
    <div className="flex-1 flex flex-col justify-start mt-2 space-y-3">
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-3 bg-muted rounded w-3/4"></div>
        <div className="h-3 bg-muted rounded w-2/3"></div>
    </div>
    <div className="mt-3 pt-3 border-t border-border flex justify-between">
        <div className="h-3 bg-muted rounded w-20"></div>
    </div>
  </div>
);

const AgentList: React.FC<AgentListProps> = ({ 
  agents, 
  onSelectAgent, 
  onToggleAgent, 
  onBlockAgent,
  onMaintenanceAgent,
  onCreateAgent, 
  userRole,
  searchQuery,
  onSearchChange,
  isLoading = false
}) => {
  const { addNotification } = useNotification();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null);
  
  // PERMISSIONS
  const canCreate = userRole === 'admin';
  const canToggle = userRole === 'admin' || userRole === 'support' || userRole === 'editor' || userRole === 'client';

  const getWorkflowId = (agentId: string): string | null => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return null;

    if (agent.workflowId) return agent.workflowId;

    for (const section of agent.configSections) {
        for (const field of section.fields) {
            if (field.id === 'n8n_workflow_id' && field.value) {
                return String(field.value);
            }
        }
    }
    return null;
  };

  const handleToggle = async (id: string, active: boolean) => {
    const agent = agents.find(a => a.id === id);
    
    // Se estiver bloqueado e o usuário não for admin
    if (agent?.isBlocked && userRole !== 'admin') {
        addNotification('error', 'Ação Bloqueada', 'Este agente foi bloqueado por um administrador.');
        return;
    }

    if (!canToggle) return;

    const workflowId = getWorkflowId(id);
    if (!workflowId) {
        addNotification('error', 'Workflow não configurado', 'Edite o agente para vincular um Workflow ID.');
        return;
    }

    // UPDATE OTIMISTA: Muda na UI instantaneamente
    onToggleAgent(id, active);
    setTogglingAgentId(id);

    try {
        // Chamada de API em background
        await toggleN8nWorkflow(workflowId, active);
        if (agent) {
            const msg = active ? `Agente ${agent.name} ativo.` : `Agente ${agent.name} em standby.`;
            addNotification(active ? 'success' : 'info', 'Status atualizado', msg);
        }
    } catch (error: any) {
        // Reverte na UI em caso de erro grave (o useAppData handleToggleAgent já cuida disso se disparar erro)
        // Mas como já chamamos onToggleAgent, se falhar aqui, o pai deve ser notificado do erro
        addNotification('error', 'Falha na Operação', error.message || 'Não foi possível comunicar com o n8n.');
        // Reverte estado local (chamando com o valor oposto)
        onToggleAgent(id, !active);
    } finally {
        setTogglingAgentId(null);
    }
  };

  const handleBlockAction = async (agent: Agent, isBlocked: boolean) => {
      const workflowId = getWorkflowId(agent.id);

      // Sincronização Remota (N8n)
      if (workflowId) {
          try {
              if (isBlocked) {
                  // Se estamos bloqueando E ele estava ativo, desliga remoto
                  if (agent.active) {
                      await toggleN8nWorkflow(workflowId, false);
                  }
              } else {
                  // Se estamos desbloqueando, verifica se ele estava ativo antes do bloqueio
                  if (agent.wasActiveBeforeBlock) {
                      await toggleN8nWorkflow(workflowId, true);
                      addNotification('success', 'Serviço Restaurado', 'Agente desbloqueado e reativado com sucesso.');
                  } else {
                      addNotification('info', 'Agente Desbloqueado', 'O agente foi liberado, mas permanece em standby.');
                  }
              }
          } catch (error) {
              console.error("Falha na sincronização de estado ao alterar bloqueio", error);
              addNotification('warning', 'Atenção', 'Estado alterado localmente, mas houve erro na sincronização com o n8n.');
          }
      }

      // Atualiza estado local (persistência)
      onBlockAgent(agent.id, isBlocked);
  };

  const handleMaintenanceAction = (agent: Agent, maintenance: boolean) => {
      onMaintenanceAgent(agent.id, maintenance);
  };

  const handleCreateAgent = async (newAgent: Agent) => {
      if (onCreateAgent) await onCreateAgent(newAgent);
      setIsFormOpen(false);
  };

  // --- VIEW: CREATE FORM ---
  if (isFormOpen && canCreate) {
    return (
        <DarkPage className="min-h-[calc(100vh-4rem)]">
        <AgentForm
            mode="create"
            existingAgents={agents}
            onSubmit={handleCreateAgent}
            onCancel={() => setIsFormOpen(false)}
        />
        </DarkPage>
    );
  }

  // --- VIEW: LIST ---
  return (
    <DarkPage className="min-h-[calc(100vh-4rem)]">
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-4">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-border rounded-lg flex items-center justify-center text-foreground bg-muted">
               <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground tracking-tight">
                    Agentes de Inteligência
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 font-light">
                Gerencie seus assistentes virtuais e automações.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            
            {/* Search Bar - Igual às outras abas */}
            <div className="relative group flex-1 md:w-64">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-foreground">
                    <Search className="w-4 h-4" />
                </div>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground pl-10 h-9" 
                    placeholder="Buscar agente..." 
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {canCreate && onCreateAgent && (
                <button 
                    onClick={() => setIsFormOpen(true)}
                    className="flex h-10 items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 rounded-md text-xs font-bold uppercase tracking-wide transition-all border border-transparent whitespace-nowrap shadow-sm"
                >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Agente</span>
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {isLoading ? (
            <>
                <AgentCardSkeleton />
                <AgentCardSkeleton />
                <AgentCardSkeleton />
                <AgentCardSkeleton />
                <AgentCardSkeleton />
                <AgentCardSkeleton />
            </>
        ) : (
            <>
                {agents.map((agent) => (
                    <AgentCard 
                        key={agent.id}
                        agent={agent}
                        isToggling={togglingAgentId === agent.id}
                        onSelect={onSelectAgent}
                        onToggle={handleToggle}
                        readonly={!canToggle}
                        userRole={userRole}
                        onBlockToggle={(blocked) => handleBlockAction(agent, blocked)}
                        onMaintenanceToggle={(_, maintenance) => handleMaintenanceAction(agent, maintenance)}
                    />
                ))}

                {canCreate && onCreateAgent && (
                  <CreateAgentCard onClick={() => setIsFormOpen(true)} />
                )}
            </>
        )}
      </div>
    </div>
    </DarkPage>
  );
};

export default AgentList;
