
import React, { useState, useEffect } from 'react';
import { Agent, ConfigSection, UserRole, ConfigField } from '../types';
import ConfigCard from '../components/ConfigCard';
import AgentPlayground from '../components/AgentPlayground';
import { ModuleEditor } from '../components/AddModuleModal'; 
import { ExecutionsDashboard } from '../components/ExecutionsDashboard';
import { Trash2, Loader2, RefreshCw, Database, Upload, Play, AlertTriangle } from '../components/ui/Icons';
import { useNotification } from '../context/NotificationContext';
import { toggleN8nWorkflow, updateN8nWorkflowConfig, fetchN8nWorkflowFullJson, extractCredentialsFromWorkflow } from '../services/n8nService';
import { AgentDetailHeader } from '../components/agents/AgentDetailHeader';
import { AgentForm } from '../components/agents/AgentForm';
import { DeleteWithCodeModal } from '../components/shared/DeleteWithCodeModal';
import { AddModuleCard } from '../components/AddModuleCard';
import { CredentialsManager } from '../components/credentials/CredentialsManager';
import { decryptPath } from '../utils/encryption';
import { getValueFromPath } from '../utils/jsonPath';
import { ragService } from '../services/ragService';
import { RagDocumentsTable } from '../components/rag/RagDocumentsTable';
import { DocumentViewerModal } from '../components/rag/DocumentViewerModal';
import { RagDocument, RagUsage } from '../types';
import DarkPage from '../components/layout/DarkPage';

const API_BASE = process.env.API_BASE;

interface AgentDetailProps {
  agent: Agent;
  allAgents: Agent[];
  onBack: () => void;
  onUpdateAgent: (updatedAgent: Agent) => Promise<void> | void;
  onDeleteAgent?: (id: string) => void;
  onRefresh?: () => Promise<void> | void; 
  userRole: UserRole | null;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

type DetailViewMode = 'config' | 'credentials' | 'executions' | 'rag' | 'editor';

// Componente de Skeleton Premium para os Cards de Configuração
const ConfigCardSkeleton = ({ span = 'md:col-span-1' }: { span?: string }) => (
    <div className={`${span} border border-border rounded-xl bg-card p-6 h-full min-h-[320px] animate-pulse flex flex-col`}>
        {/* Header: Icon + Title */}
        <div className="flex items-start gap-4 mb-6 border-b border-border pb-4">
            <div className="w-10 h-10 bg-muted rounded-lg shrink-0"></div>
            <div className="space-y-2 w-full pt-1">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
        </div>
        
        {/* Body: Inputs */}
        <div className="flex-1 space-y-5">
            <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-24"></div>
                <div className="h-10 bg-muted rounded w-full"></div>
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-32"></div>
                <div className="h-20 bg-muted rounded w-full"></div>
            </div>
             <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-20"></div>
                <div className="h-10 bg-muted rounded w-full"></div>
            </div>
        </div>

        {/* Footer: Button */}
        <div className="flex justify-end pt-4 mt-2 border-t border-border">
            <div className="h-9 bg-muted rounded w-24"></div>
        </div>
    </div>
);

const AgentDetail: React.FC<AgentDetailProps> = ({ 
  agent, 
  allAgents,
  onBack, 
  onUpdateAgent, 
  onDeleteAgent,
  onRefresh,
  userRole,
  initialTab,
  onTabChange
}) => {
  const { addNotification } = useNotification();
  const [showPlayground, setShowPlayground] = useState(false);
  
  // Estado para loading inicial visual (Skeleton Effect)
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  
  // RAG State
  const [ragDocuments, setRagDocuments] = useState<RagDocument[]>([]);
  const [isLoadingRag, setIsLoadingRag] = useState(false);
  const [selectedRagDoc, setSelectedRagDoc] = useState<RagDocument | null>(null);
  const [isRagDocModalOpen, setIsRagDocModalOpen] = useState(false);
  const [isLoadingRagContent, setIsLoadingRagContent] = useState(false);
  const [isDeleteRagModalOpen, setIsDeleteRagModalOpen] = useState(false);
  const [ragDocToDelete, setRagDocToDelete] = useState<RagDocument | null>(null);
  const [ragSyncCooldown, setRagSyncCooldown] = useState(0);
  const [isUploadingRagFile, setIsUploadingRagFile] = useState(false);
  const [selectedRagIds, setSelectedRagIds] = useState<number[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [isDeleteBulkRagModalOpen, setIsDeleteBulkRagModalOpen] = useState(false);
  const [ragUsage, setRagUsage] = useState<RagUsage | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDeleteBulkRagDocs = () => {
    if (selectedRagIds.length === 0) return;
    setIsDeleteBulkRagModalOpen(true);
  };

  const confirmDeleteBulkRagDocs = async () => {
    setIsDeleteBulkRagModalOpen(false);
    setIsLoadingRag(true);
    setIsDeletingBulk(true);

    try {
        const result = await ragService.deleteBulk(agent.id, selectedRagIds);
        addNotification('success', 'Exclusão concluída', `${result.deleted_count} documentos foram removidos com sucesso.`);
        if (result.not_found_count > 0) {
            addNotification('warning', 'Aviso', `${result.not_found_count} documentos não foram encontrados.`);
        }
        setSelectedRagIds([]);
        await fetchRagDocuments();
    } catch (error) {
        console.error(error);
        addNotification('error', 'Erro', 'Falha ao excluir documentos em massa.');
    } finally {
        setIsLoadingRag(false);
        setIsDeletingBulk(false);
    }
  };

  const handleRagFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !agent.ragEnabled || isUploadingRagFile) return;

    setIsUploadingRagFile(true);
    try {
      await ragService.upload(agent.id, file);
      addNotification('success', 'Upload concluído', 'Arquivo enviado com sucesso para a base de conhecimento.');
      
      // Sincroniza automaticamente após o upload bem-sucedido (isManual = false para ignorar cooldown)
      await fetchRagDocuments(false);
    } catch (error: any) {
      console.error('Error uploading RAG file:', error);
      addNotification('error', 'Erro no Upload', error.message || 'Não foi possível enviar o arquivo.');
    } finally {
      setIsUploadingRagFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- PERMISSIONS LOGIC ---
  const isAdmin = userRole === 'admin';
  const isSupport = userRole === 'support';
  const isEditor = userRole === 'editor';
  const isClient = userRole === 'client';

  const defaultTab = isClient ? 'executions' : 'config';
  const startTab = (initialTab && ['rag', 'config', 'credentials', 'executions'].includes(initialTab)) 
    ? (initialTab as DetailViewMode) 
    : defaultTab;

  const [viewMode, setViewMode] = useState<DetailViewMode>(startTab);
  
  useEffect(() => {
    if (initialTab && ['rag', 'config', 'credentials', 'executions'].includes(initialTab)) {
        setViewMode(initialTab as DetailViewMode);
    }
  }, [initialTab]);

  // Simula tempo de carregamento para efeito visual suave na entrada
  useEffect(() => {
      const loadInitialData = async () => {
          if (viewMode === 'config' && !hasSynced) {
              await syncWorkflowData();
          } else {
              // Pequeno delay para suavidade se não precisar sincronizar
              await new Promise(resolve => setTimeout(resolve, 600));
          }
          setInitialLoading(false);
      };
      
      loadInitialData();
  }, []);

  // Sincroniza se mudar para a aba de config e ainda não tiver sincronizado
  useEffect(() => {
      if (viewMode === 'rag' && agent.ragEnabled === false) {
          handleTabChange('config');
          return;
      }

      if (viewMode === 'config' && !hasSynced && !initialLoading) {
          syncWorkflowData();
      }
      
      if (viewMode === 'rag') {
          fetchRagDocuments();
      }
  }, [viewMode, hasSynced, initialLoading, agent.id]);

  const RAG_COOLDOWN_KEY = `rag_sync_cooldown_${agent.id}`;

  useEffect(() => {
    const storedExpiration = localStorage.getItem(RAG_COOLDOWN_KEY);
    if (storedExpiration) {
        const expirationTime = parseInt(storedExpiration, 10);
        const remaining = Math.ceil((expirationTime - Date.now()) / 1000);
        if (remaining > 0) {
            setRagSyncCooldown(remaining);
        } else {
            localStorage.removeItem(RAG_COOLDOWN_KEY);
        }
    }
  }, [agent.id]);

  useEffect(() => {
    if (ragSyncCooldown > 0) {
        const timer = setInterval(() => {
            setRagSyncCooldown(prev => {
                const next = prev - 1;
                if (next <= 0) {
                    localStorage.removeItem(RAG_COOLDOWN_KEY);
                    return 0;
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(timer);
    }
  }, [ragSyncCooldown, RAG_COOLDOWN_KEY]);

  const fetchRagDocuments = async (isManual = false) => {
      if (isLoadingRag || (isManual && ragSyncCooldown > 0)) return;
      
      setIsLoadingRag(true);
      try {
          // Fetch both concurrently but handle them individually to be more resilient
          const [docsResult, usageResult] = await Promise.allSettled([
              ragService.list(agent.id),
              ragService.getUsage(agent.id)
          ]);
          
          if (docsResult.status === 'fulfilled') {
              setRagDocuments(docsResult.value);
          } else {
              console.error('Failed to fetch RAG documents:', docsResult.reason);
              addNotification('error', 'Erro', 'Falha ao carregar lista de documentos RAG.');
          }

          if (usageResult.status === 'fulfilled') {
              setRagUsage(usageResult.value);
          } else {
              console.warn('Failed to fetch RAG usage:', usageResult.reason);
          }
          
          if (isManual && (docsResult.status === 'fulfilled' || usageResult.status === 'fulfilled')) {
              const cooldownSeconds = 10;
              const expirationTime = Date.now() + (cooldownSeconds * 1000);
              localStorage.setItem(RAG_COOLDOWN_KEY, expirationTime.toString());
              setRagSyncCooldown(cooldownSeconds);
              addNotification('success', 'Sincronizado', 'Dados da base de conhecimento atualizados.');
          }
      } catch (error) {
          console.error('Unexpected error in fetchRagDocuments:', error);
          addNotification('error', 'Erro', 'Ocorreu um erro inesperado ao sincronizar.');
      } finally {
          setIsLoadingRag(false);
      }
  };

  const handleViewRagDoc = async (doc: RagDocument) => {
      setSelectedRagDoc(doc);
      setIsRagDocModalOpen(true);
      setIsLoadingRagContent(true);
      
      try {
          const fullDoc = await ragService.get(agent.id, doc.id);
          setSelectedRagDoc(fullDoc);
      } catch (error) {
          console.error(error);
          addNotification('error', 'Erro', 'Falha ao carregar conteúdo do documento.');
      } finally {
          setIsLoadingRagContent(false);
      }
  };

  const handleDeleteRagDoc = (id: number) => {
      const doc = ragDocuments.find(d => d.id === id);
      if (doc) {
          setRagDocToDelete(doc);
          setIsDeleteRagModalOpen(true);
      }
  };

  const confirmDeleteRagDoc = async () => {
      if (!ragDocToDelete) return;

      setIsDeleteRagModalOpen(false);
      setIsLoadingRag(true); // Show loading on table while deleting/refreshing

      try {
          await ragService.delete(agent.id, ragDocToDelete.id);
          addNotification('success', 'Documento excluído', `O arquivo ${ragDocToDelete.file_name} foi removido.`);
          await fetchRagDocuments(); // Refresh list
      } catch (error) {
          console.error(error);
          addNotification('error', 'Erro', 'Falha ao excluir documento.');
          setIsLoadingRag(false); // Stop loading if error (fetchRagDocuments handles it otherwise)
      } finally {
          setRagDocToDelete(null);
      }
  };

  const [editingSection, setEditingSection] = useState<ConfigSection | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleteAgentModalOpen, setIsDeleteAgentModalOpen] = useState(false);

  // --- POLLING & AUTO-REFRESH ---
  // Garante que o cliente veja atualizações (como visibilidade de credenciais) quase em tempo real
  useEffect(() => {
      // ATUALIZAÇÃO INTELIGENTE: Apenas na aba de Credenciais
      const shouldPoll = viewMode === 'credentials' && !isEditing && !isToggling && !deletingSectionId;
      
      if (!onRefresh || !shouldPoll) return;

      // Polling periódico (10s)
      const intervalId = setInterval(() => {
          onRefresh();
      }, 10000);

      // Atualização ao focar na janela
      const handleFocus = () => {
          onRefresh();
      };
      window.addEventListener('focus', handleFocus);

      return () => {
          clearInterval(intervalId);
          window.removeEventListener('focus', handleFocus);
      };
  }, [onRefresh, isEditing, viewMode, isToggling, deletingSectionId]);

  // --- SYNC WITH WORKFLOW ---
  const syncWorkflowData = async (isManual = false) => {
    if (isSyncing) return;

    const wfId = getWorkflowId();
    if (!wfId) {
        setHasSynced(true);
        if (isManual) addNotification('warning', 'Sem Workflow', 'Não há ID de workflow configurado.');
        return;
    }

    setIsSyncing(true);
    try {
      const workflowJson = await fetchN8nWorkflowFullJson(wfId, isManual);
      if (!workflowJson) throw new Error("Workflow JSON não encontrado");
      
      let hasChanges = false;
      const updatedSections = agent.configSections.map(section => {
        const updatedFields = section.fields.map(field => {
          if (field.jsonPath) {
            const realPath = decryptPath(field.jsonPath);
            const remoteValue = getValueFromPath(workflowJson, realPath);
            
            // Comparação para detectar mudanças (incluindo arrays/objetos)
            const isDifferent = JSON.stringify(remoteValue) !== JSON.stringify(field.value);

            // Só atualiza se o valor for encontrado no workflow e for diferente do atual
            if (remoteValue !== undefined && isDifferent) {
              hasChanges = true;
              return { ...field, value: remoteValue };
            }
          }
          return field;
        });
        return { ...section, fields: updatedFields };
      });

      // Verifica se o status ativo mudou
      let newActiveStatus = agent.active;
      if (workflowJson.active !== undefined && workflowJson.active !== agent.active) {
          newActiveStatus = workflowJson.active;
          hasChanges = true;
      }

      if (hasChanges) {
        await onUpdateAgent({ ...agent, configSections: updatedSections, active: newActiveStatus });
        addNotification('success', 'Sincronizado', 'Configurações e status atualizados com dados do n8n.');
      } else if (isManual) {
        addNotification('info', 'Sincronizado', 'As configurações já estão atualizadas.');
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      addNotification('error', 'Erro de Sincronização', 'Não foi possível obter os dados atuais do workflow n8n.');
    } finally {
      setHasSynced(true);
      setIsSyncing(false);
    }
  };

  const [hasVisibleCredentials, setHasVisibleCredentials] = useState(false);

  const canEditAgent = isAdmin || isEditor; 
  const canDeleteAgent = isAdmin;
  const canEditConfigValues = isAdmin || isSupport || isEditor || isClient;
  const canEditConfigStructure = isAdmin || isEditor || isSupport;
  const canToggleStatus = isAdmin || isSupport || isEditor || isClient;

  const getWorkflowId = (): string | null => {
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

  // --- CALCULA VISIBILIDADE DAS ABAS ---
  
  const visibleConfigSections = agent.configSections.filter(section => {
      if (section.id === 'system_integration') return false;
      if (section.id === 'credential_meta') return false;
      if (isClient && section.visibleToClient === false) return false;
      return true;
  });

  const showConfigTab = !isClient || visibleConfigSections.length > 0;

  useEffect(() => {
      if (!isClient) {
          setHasVisibleCredentials(true);
          return;
      }

      const checkCredentials = async () => {
          const wfId = getWorkflowId();
          if (!wfId) {
              setHasVisibleCredentials(false);
              return;
          }
          
          try {
              const json = await fetchN8nWorkflowFullJson(wfId);
              const creds = extractCredentialsFromWorkflow(json);
              
              const metaSection = agent.configSections.find(s => s.id === 'credential_meta');
              const metaField = metaSection?.fields.find(f => f.id === 'meta_json');
              const meta = metaField?.value ? JSON.parse(String(metaField.value)) : {};
              
              const visible = creds.filter(c => !meta[c.id]?.hidden);
              
              setHasVisibleCredentials(visible.length > 0);
          } catch (e) {
              setHasVisibleCredentials(false);
          }
      };

      checkCredentials();
  }, [agent.id, isClient, agent.configSections]);

  const showCredentialsTab = !isClient || hasVisibleCredentials;

  useEffect(() => {
      let nextView = viewMode;
      if (viewMode === 'config' && !showConfigTab) {
          nextView = 'executions';
      } else if (viewMode === 'credentials' && !showCredentialsTab) {
          nextView = 'executions';
      }
      
      if (nextView !== viewMode) {
          setViewMode(nextView);
          if (onTabChange) onTabChange(nextView);
      }
  }, [showConfigTab, showCredentialsTab, viewMode]);

  const handleTabChange = (mode: DetailViewMode) => {
      setViewMode(mode);
      if (onTabChange && mode !== 'editor') {
          onTabChange(mode);
      }
  };

  const handleGlobalToggle = async (active: boolean) => {
    if (!canToggleStatus) return;

    const workflowId = getWorkflowId();
    if (!workflowId) {
        addNotification('error', 'Configuração Incompleta', 'Este agente não possui um Workflow ID vinculado.');
        return;
    }

    setIsToggling(true);

    try {
        onUpdateAgent({ ...agent, active });
        await toggleN8nWorkflow(workflowId, active);
        
        setTimeout(async () => {
            if (onRefresh) {
                await onRefresh();
            }
            setIsToggling(false);
        }, 1200);

        const msg = active ? 'O agente está operante.' : 'O agente está em modo de espera.';
        addNotification(active ? 'success' : 'info', 'Status atualizado', msg);
    } catch (error: any) {
        addNotification('error', 'Erro na Sincronização', error.message || 'Não foi possível alterar o status no n8n.');
        onUpdateAgent({ ...agent, active: !active });
        setIsToggling(false);
    }
  };

  const handleSaveSettings = async (updatedAgent: Agent) => {
    await onUpdateAgent(updatedAgent);
    setIsEditing(false);
  };

  const confirmDeleteAgent = () => {
    if (onDeleteAgent && canDeleteAgent) {
        onDeleteAgent(agent.id);
        addNotification('info', 'Agente removido', 'O agente e suas configurações foram excluídos.');
    }
  };

  const handleSaveModule = async (newSection: ConfigSection) => {
    let updatedAgent = { ...agent };
    let updatedSections = [...agent.configSections];
    
    if (editingSection) {
        updatedSections = updatedSections.map(s => s.id === newSection.id ? newSection : s);
    } else {
        updatedSections.push(newSection);
    }
    updatedAgent.configSections = updatedSections;

    await onUpdateAgent(updatedAgent);
    addNotification('success', 'Módulo salvo', 'A configuração foi atualizada.');
    
    if (onRefresh) {
        setIsDataRefreshing(true);
        await onRefresh();
        setTimeout(() => setIsDataRefreshing(false), 500);
    }
    
    handleTabChange('config');
    setEditingSection(null);
  };

  const [isSavingAll, setIsSavingAll] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ConfigSection[]>([]);
  const [syncCooldown, setSyncCooldown] = useState(0);

  // --- PERSISTENT SYNC COOLDOWN ---
  const COOLDOWN_KEY = `sync_cooldown_${agent.id}`;

  useEffect(() => {
    const storedExpiration = localStorage.getItem(COOLDOWN_KEY);
    if (storedExpiration) {
        const expirationTime = parseInt(storedExpiration, 10);
        const remaining = Math.ceil((expirationTime - Date.now()) / 1000);
        if (remaining > 0) {
            setSyncCooldown(remaining);
        } else {
            localStorage.removeItem(COOLDOWN_KEY);
        }
    }
  }, [agent.id]);

  useEffect(() => {
    if (syncCooldown > 0) {
        const timer = setInterval(() => {
            setSyncCooldown(prev => {
                const next = prev - 1;
                if (next <= 0) {
                    localStorage.removeItem(COOLDOWN_KEY);
                    return 0;
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(timer);
    }
  }, [syncCooldown, COOLDOWN_KEY]);

  const handleManualSync = async () => {
      if (isSyncing || syncCooldown > 0) return;
      await syncWorkflowData(true);
      
      const cooldownSeconds = 10;
      const expirationTime = Date.now() + (cooldownSeconds * 1000);
      localStorage.setItem(COOLDOWN_KEY, expirationTime.toString());
      setSyncCooldown(cooldownSeconds);
  };

  const handleConfigChange = (updatedSection: ConfigSection) => {
    setPendingChanges(prev => {
        const existing = prev.findIndex(s => s.id === updatedSection.id);
        if (existing >= 0) {
            const newPending = [...prev];
            newPending[existing] = updatedSection;
            return newPending;
        }
        return [...prev, updatedSection];
    });
  };

  const handleSaveAll = async () => {
    if (pendingChanges.length === 0) return;
    
    setIsSavingAll(true);
    try {
        let updatedAgent = { ...agent };
        let updatedSections = [...agent.configSections];

        // Apply all pending changes locally
        pendingChanges.forEach(change => {
            updatedSections = updatedSections.map(s => s.id === change.id ? change : s);
        });
        updatedAgent.configSections = updatedSections;

        // Collect all n8n updates
        const workflowId = getWorkflowId();
        const n8nUpdates: { id: string; value: string }[] = [];

        pendingChanges.forEach(section => {
            const originalSection = agent.configSections.find(s => s.id === section.id);
            if (!originalSection) return;

            section.fields.forEach(field => {
                const originalField = originalSection.fields.find(f => f.id === field.id);
                if (originalField && field.value !== originalField.value && field.jsonPath && field.value !== undefined && field.value !== '') {
                    n8nUpdates.push({
                        id: decryptPath(field.jsonPath),
                        value: String(field.value)
                    });
                }
            });
        });

        // Save to n8n if needed
        if (n8nUpdates.length > 0 && workflowId) {
            await updateN8nWorkflowConfig(workflowId, n8nUpdates);
        }

        // Save agent
        await onUpdateAgent(updatedAgent);
        
        if (onRefresh) {
            await onRefresh();
        }

        addNotification('success', 'Configurações salvas', 'Todas as alterações foram aplicadas com sucesso.');
        setPendingChanges([]);
    } catch (error: any) {
        addNotification('error', 'Erro ao salvar', error.message || 'Falha ao atualizar configurações.');
    } finally {
        setIsSavingAll(false);
    }
  };


  const handleCancelEditor = () => {
      handleTabChange('config');
      setEditingSection(null);
  };

  const confirmDeleteModule = async () => {
    if (!deletingSectionId) return;
    let updatedAgent = { ...agent };

    const updatedSections = agent.configSections.filter(s => s.id !== deletingSectionId);
    updatedAgent.configSections = updatedSections;
    
    await onUpdateAgent(updatedAgent);
    
    if (onRefresh) {
        setIsDataRefreshing(true);
        await onRefresh();
        setTimeout(() => setIsDataRefreshing(false), 500);
    }

    addNotification('info', 'Módulo removido', 'A configuração foi excluída.');
    setDeletingSectionId(null);
  };

  const handleEditModule = (section: ConfigSection) => {
      setEditingSection(section);
      setViewMode('editor');
  };

  const handleAddModule = () => {
      setEditingSection(null);
      setViewMode('editor');
  };

  const handleMoveModule = async (sectionId: string, direction: 'up' | 'down') => {
      const index = agent.configSections.findIndex(s => s.id === sectionId);
      if (index < 0) return;
      
      const newSections = [...agent.configSections];
      if (direction === 'up' && index > 0) {
          [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
      } else if (direction === 'down' && index < newSections.length - 1) {
          [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      } else {
          return; // Não moveu
      }

      await onUpdateAgent({ ...agent, configSections: newSections });
  };

  const handleWidthChange = async (sectionId: string, width: '33%' | '66%' | '100%') => {
      const updatedSections = agent.configSections.map(s => 
          s.id === sectionId ? { ...s, layoutWidth: width } : s
      );
      await onUpdateAgent({ ...agent, configSections: updatedSections });
  };

  if (isEditing && canEditAgent) {
    return (
        <DarkPage className="min-h-[calc(100vh-4rem)]">
            <AgentForm
                mode="edit"
                agent={agent}
                existingAgents={allAgents}
                onSubmit={handleSaveSettings}
                onCancel={() => setIsEditing(false)}
                onDelete={onDeleteAgent && canDeleteAgent ? () => setIsDeleteAgentModalOpen(true) : undefined}
                userRole={userRole}
            />
            <DeleteWithCodeModal 
                isOpen={isDeleteAgentModalOpen}
                title="Excluir Agente?"
                description={<>Para confirmar a exclusão de <strong>{agent.name}</strong>, digite o código abaixo:</>}
                onClose={() => setIsDeleteAgentModalOpen(false)}
                onConfirm={confirmDeleteAgent}
            />
        </DarkPage>
    );
  }

  if (viewMode === 'editor' && canEditConfigStructure) {
      return (
          <DarkPage className="min-h-[calc(100vh-4rem)]">
          <ModuleEditor
            onClose={handleCancelEditor}
            onSave={handleSaveModule}
            initialData={editingSection}
            agentWorkflowId={getWorkflowId() || ''}
          />
          </DarkPage>
      );
  }

  return (
    <DarkPage className="min-h-[calc(100vh-4rem)]">
    <div className="flex flex-col gap-8 pb-12 w-full max-w-7xl mx-auto">
      
      <AgentDetailHeader 
        agent={agent}
        viewMode={viewMode as 'config' | 'credentials' | 'executions'}
        setViewMode={(mode) => handleTabChange(mode)}
        isClientMode={isClient}
        isToggling={isToggling}
        onBack={onBack}
        onEdit={canEditAgent ? () => setIsEditing(true) : undefined}
        onDelete={onDeleteAgent && canDeleteAgent ? () => setIsDeleteAgentModalOpen(true) : undefined}
        onToggleGlobal={handleGlobalToggle}
        onPlayground={() => setShowPlayground(true)}
        showConfigTab={showConfigTab}
        showCredentialsTab={showCredentialsTab}
        isLoading={initialLoading}
      />

      {/* Main Content Area */}
      
      {viewMode === 'rag' && (
  <div className="animate-fade-in">
    <div className="mb-8 flex items-end justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-primary rounded-full"></div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            Base de Conhecimento (RAG)
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1 pl-4 flex items-center gap-2">
          Gerencie os documentos e informações que o agente utiliza para responder.
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          {ragUsage && (
            <div
              className={`flex flex-col justify-center px-4 py-2.5 rounded-lg shadow-sm border bg-card border-border min-w-[180px] transition-all duration-300 ${
                isLoadingRag ? 'opacity-60' : 'opacity-100'
              }`}
            >
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ease-out rounded-full ${
                    isLoadingRag
                      ? 'bg-muted-foreground'
                      : ragUsage.is_over_limit
                      ? 'bg-red-500'
                      : ragUsage.usage_percent > 80
                      ? 'bg-amber-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(ragUsage.usage_percent, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-[8px] text-muted-foreground font-medium tracking-tight leading-none">
                  {(ragUsage.total_bytes / 1024 / 1024).toFixed(2)} / {ragUsage.storage_limit_mb} MB
                </span>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-bold tabular-nums leading-none ${
                      ragUsage.is_over_limit ? 'text-red-400' : 'text-foreground'
                    }`}
                  >
                    {ragUsage.usage_percent}%
                  </span>

                  {ragUsage.is_over_limit && !isLoadingRag && (
                    <span className="text-[8px] text-red-400 font-bold flex items-center gap-0.5 uppercase tracking-wider leading-none animate-pulse">
                      <AlertTriangle className="w-2 h-2" /> Limite
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {agent.ragEnabled && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleRagFileUpload}
                className="hidden"
                accept=".pdf,.txt,.doc,.docx,.csv"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingRagFile}
                className={`flex h-10 items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm border 
                  ${
                    isUploadingRagFile
                      ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  }`}
              >
                {isUploadingRagFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {isUploadingRagFile ? 'Enviando...' : 'Upload'}
              </button>
            </>
          )}

          <button
            onClick={() => fetchRagDocuments(true)}
            disabled={isLoadingRag || ragSyncCooldown > 0}
            className={`
              flex h-10 items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm border
              ${
                isLoadingRag || ragSyncCooldown > 0
                  ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }
            `}
            title={ragSyncCooldown > 0 ? `Aguarde ${ragSyncCooldown}s` : 'Atualizar lista de documentos'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRag ? 'animate-spin' : ''}`} />
            {ragSyncCooldown > 0 ? `${ragSyncCooldown}s` : 'Sincronizar'}
          </button>
        </div>
      </div>
    </div>

    <RagDocumentsTable
      documents={ragDocuments}
      isLoading={isLoadingRag}
      selectedIds={selectedRagIds}
      onSelectionChange={setSelectedRagIds}
      onView={handleViewRagDoc}
      onDelete={handleDeleteRagDoc}
      onBulkDelete={handleDeleteBulkRagDocs}
      isDeletingBulk={isDeletingBulk}
    />
  </div>
)}

      {/* RAG Viewer Modal */}
      <DocumentViewerModal 
        isOpen={isRagDocModalOpen}
        onClose={() => setIsRagDocModalOpen(false)}
        document={selectedRagDoc}
        isLoading={isLoadingRagContent}
      />

      {/* Delete RAG Document Modal */}
      <DeleteWithCodeModal 
        isOpen={isDeleteRagModalOpen}
        title="Excluir Documento?"
        description={<>Tem certeza que deseja excluir o arquivo <strong>{ragDocToDelete?.file_name}</strong>? Esta ação é irreversível.</>}
        onClose={() => setIsDeleteRagModalOpen(false)}
        onConfirm={confirmDeleteRagDoc}
      />

      {/* Delete Bulk RAG Modal */}
      <DeleteWithCodeModal 
        isOpen={isDeleteBulkRagModalOpen}
        title="Excluir Múltiplos Documentos?"
        description={<>Tem certeza que deseja excluir <strong>{selectedRagIds.length}</strong> documentos selecionados? Esta ação é irreversível.</>}
        onClose={() => setIsDeleteBulkRagModalOpen(false)}
        onConfirm={confirmDeleteBulkRagDocs}
      />

      {viewMode === 'config' && showConfigTab && (
        <div className="animate-fade-in">
          <div className="mb-8 flex items-end justify-between">
             <div>
                 <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">Módulos de Configuração</h2>
                 </div>
                 <p className="text-sm text-muted-foreground mt-1 pl-4">Gerencie os parâmetros de comportamento do agente.</p>
             </div>
             
             {pendingChanges.length > 0 && (
                 <button 
                    onClick={handleSaveAll}
                    disabled={isSavingAll}
                    className="flex h-10 items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed font-bold uppercase tracking-wide text-xs"
                 >
                    {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isSavingAll ? 'Salvando...' : `Salvar Alterações (${pendingChanges.length})`}
                 </button>
             )}
             
             {pendingChanges.length === 0 && canEditConfigValues && (
                 <button
                    onClick={handleManualSync}
                    disabled={isSyncing || syncCooldown > 0}
                    className={`
                        flex h-10 items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm border
                        ${isSyncing || syncCooldown > 0 
                            ? 'bg-muted text-muted-foreground border-border cursor-not-allowed' 
                            : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'}
                    `}
                    title={syncCooldown > 0 ? `Aguarde ${syncCooldown}s` : 'Sincronizar com n8n'}
                 >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {syncCooldown > 0 ? `${syncCooldown}s` : 'Sincronizar'}
                 </button>
             )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {initialLoading || isDataRefreshing || isSyncing ? (
                // Exibe skeletons em loop simulando cards variados
                <>
                    <ConfigCardSkeleton span="md:col-span-1" />
                    <ConfigCardSkeleton span="md:col-span-2" />
                    <ConfigCardSkeleton span="md:col-span-1" />
                </>
            ) : (
                <>
                    {visibleConfigSections.map((section) => {
                      let spanClass = 'md:col-span-1'; 

                      if (section.layoutWidth === '100%') spanClass = 'md:col-span-3';
                      else if (section.layoutWidth === '66%') spanClass = 'md:col-span-2';
                      else if (section.layoutWidth === '33%') spanClass = 'md:col-span-1';
                      
                      // Fallbacks legados
                      if (section.layoutWidth === '25%' as any) spanClass = 'md:col-span-1';
                      if (section.layoutWidth === '50%' as any) spanClass = 'md:col-span-2';

                      return (
                        <div key={section.id} className={`${spanClass} flex flex-col`}>
                          <ConfigCard 
                              section={section} 
                              onEdit={canEditConfigStructure ? handleEditModule : undefined}
                              onDelete={canEditConfigStructure ? setDeletingSectionId : undefined}
                              onMoveUp={canEditConfigStructure ? (id) => handleMoveModule(id, 'up') : undefined}
                              onMoveDown={canEditConfigStructure ? (id) => handleMoveModule(id, 'down') : undefined}
                              onWidthChange={canEditConfigStructure ? handleWidthChange : undefined}
                              onSaveSection={handleConfigChange}
                              isAdmin={canEditConfigStructure}
                              isLocked={!canEditConfigValues}
                              variant="default"
                          />
                        </div>
                      );
                    })}
                    
                    {canEditConfigStructure && (
                        <div className="md:col-span-1 min-h-[200px]">
                            <AddModuleCard onClick={handleAddModule} />
                        </div>
                    )}
                </>
            )}
          </div>
        </div>
      )}

      {viewMode === 'credentials' && showCredentialsTab && (
        <div className="animate-fade-in">
          <CredentialsManager 
              workflowId={getWorkflowId()} 
              agent={agent}
              onUpdateAgent={onUpdateAgent}
              isClientMode={isClient}
          />
        </div>
      )}

      {viewMode === 'executions' && (
        <div className="animate-fade-in">
          <ExecutionsDashboard agent={agent} />
        </div>
      )}

      {showPlayground && (
        <AgentPlayground 
          agent={agent} 
          onClose={() => setShowPlayground(false)} 
        />
      )}

      {deletingSectionId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card rounded-lg shadow-2xl border border-border max-w-sm w-full p-6 animate-scale-in">
                <div className="flex flex-col items-center text-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Excluir Módulo?</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Esta ação removerá permanentemente este módulo de configuração do agente.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full pt-2">
                        <button 
                            onClick={() => setDeletingSectionId(null)}
                            className="flex h-10 flex-1 items-center justify-center py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDeleteModule}
                            className="flex h-10 flex-1 items-center justify-center py-2 text-sm font-bold text-red-50 bg-red-700 hover:bg-red-600 rounded-md transition-colors shadow-sm"
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <DeleteWithCodeModal 
        isOpen={isDeleteAgentModalOpen}
        title="Excluir Agente?"
        description={<>Para confirmar a exclusão de <strong>{agent.name}</strong>, digite o código abaixo:</>}
        onClose={() => setIsDeleteAgentModalOpen(false)}
        onConfirm={confirmDeleteAgent}
      />

    </div>
    </DarkPage>
  );
};

export default AgentDetail;
