
import React, { useState, useEffect } from 'react';
import { Key, AlertCircle, Eye, EyeOff } from '../ui/Icons';
import { useNotification } from '../../context/NotificationContext';
import { fetchN8nWorkflowFullJson, extractCredentialsFromWorkflow, WorkflowCredential, updateN8nCredential } from '../../services/n8nService';
import SpotlightCard from '../ui/SpotlightCard';
import { CredentialForm } from './CredentialForm';
import { Agent, ConfigSection } from '../../types';

interface CredentialsManagerProps {
    workflowId: string | null;
    agent: Agent;
    onUpdateAgent: (agent: Agent) => void;
    isClientMode?: boolean; 
}

interface CredentialMeta {
    hidden?: boolean;
}

// Componente de Skeleton para efeito de carregamento premium
const CredentialSkeleton = () => (
    <div className="border border-border rounded-xl bg-card p-6 h-full animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-muted rounded-lg"></div>
            <div className="w-6 h-6 bg-muted rounded"></div>
        </div>
        <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
    </div>
);

export const CredentialsManager: React.FC<CredentialsManagerProps> = ({ workflowId, agent, onUpdateAgent, isClientMode = false }) => {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  
  const [detectedCredentials, setDetectedCredentials] = useState<WorkflowCredential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<WorkflowCredential | null>(null);
  const [credentialMeta, setCredentialMeta] = useState<Record<string, CredentialMeta>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncCooldown, setSyncCooldown] = useState(0);

  useEffect(() => {
    if (syncCooldown > 0) {
        const timer = setInterval(() => {
            setSyncCooldown(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }
  }, [syncCooldown]);

  useEffect(() => {
      if (!agent) return;
      const metaSection = agent.configSections.find(s => s.id === 'credential_meta');
      if (metaSection) {
          const metaField = metaSection.fields.find(f => f.id === 'meta_json');
          if (metaField && metaField.value) {
              try {
                  setCredentialMeta(JSON.parse(String(metaField.value)));
              } catch (e) {
                  console.error("Erro ao ler metadados", e);
              }
          }
      } else {
          // MigraÃ§Ã£o do localStorage se existir
          const storageKey = `ebettr_cred_meta_${agent.id}`;
          const savedMeta = localStorage.getItem(storageKey);
          if (savedMeta) {
              try {
                  const parsed = JSON.parse(savedMeta);
                  setCredentialMeta(parsed);
                  saveMeta(parsed); // Salva no backend
              } catch (e) {}
          }
      }
  }, [agent]);

  const saveMeta = (newMeta: Record<string, CredentialMeta>) => {
      setCredentialMeta(newMeta);
      
      let updatedSections = [...agent.configSections];
      const metaSectionIndex = updatedSections.findIndex(s => s.id === 'credential_meta');
      
      const newMetaSection: ConfigSection = {
          id: 'credential_meta',
          title: 'Metadados de Credenciais',
          description: 'Armazena visibilidade das credenciais',
          icon: 'settings',
          visibleToClient: false,
          fields: [
              {
                  id: 'meta_json',
                  label: 'Meta',
                  type: 'hidden',
                  value: JSON.stringify(newMeta)
              }
          ]
      };

      if (metaSectionIndex >= 0) {
          updatedSections[metaSectionIndex] = newMetaSection;
      } else {
          updatedSections.push(newMetaSection);
      }

      onUpdateAgent({ ...agent, configSections: updatedSections });
  };

  const loadCredentials = async (force = false) => {
      if (!workflowId) return;
      if (force && syncCooldown > 0) return;

      setLoading(true);
      if (force) {
          setIsRefreshing(true);
          setSyncCooldown(60);
      }
      try {
          const json = await fetchN8nWorkflowFullJson(workflowId, force);
          let creds = extractCredentialsFromWorkflow(json);
          setDetectedCredentials(creds);
          if (force) addNotification('success', 'Atualizado', 'Lista de credenciais sincronizada.');
      } catch (error) {
          console.error("Failed to load credentials", error);
          addNotification('error', 'Erro ao carregar', 'NÃ£o foi possÃ­vel analisar as credenciais do workflow.');
      } finally {
          setTimeout(() => {
              setLoading(false);
              setIsRefreshing(false);
          }, 600);
      }
  };

  useEffect(() => {
      loadCredentials();
  }, [workflowId]);

  const handleEditCredential = (cred: WorkflowCredential) => {
      setSelectedCredential(cred);
  };

  const handleToggleVisibility = (e: React.MouseEvent, credId: string) => {
      e.stopPropagation();
      if (isClientMode || !agent) return;
      const current = credentialMeta[credId] || {};
      const newHidden = !current.hidden;
      const newMeta = { ...credentialMeta, [credId]: { ...current, hidden: newHidden } };
      saveMeta(newMeta);
      addNotification('info', !newHidden ? 'VisÃ­vel' : 'Oculta', !newHidden ? 'Liberado para o cliente.' : 'Ocultado do cliente.');
  };

  const handleSaveCredential = async (data: any) => {
      if (!selectedCredential) return;
      try {
          await updateN8nCredential(selectedCredential.id, {
              name: selectedCredential.name,
              type: selectedCredential.type,
              data: data
          });
          addNotification('success', 'Credencial Atualizada', 'As configuraÃ§Ãµes foram salvas com sucesso.');
          setSelectedCredential(null);
      } catch (error: any) {
          addNotification('error', 'Erro ao Salvar', error.message || 'Falha na comunicaÃ§Ã£o.');
      }
  };

  if (!workflowId) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-muted/40 border border-dashed border-border rounded-xl text-muted-foreground">
            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm font-medium">Workflow nÃ£o configurado</span>
            <p className="text-xs mt-1">Vincule um Workflow ID para gerenciar credenciais.</p>
        </div>
      );
  }

  const visibleCredentials = detectedCredentials.filter(cred => {
      const meta = credentialMeta[cred.id];
      const isHidden = meta?.hidden === true;
      return !isClientMode || !isHidden;
  });

  return (
      <>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-400 rounded-full"></div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">Credenciais & Segredos</h2>
              </div>
               <p className="text-sm text-muted-foreground mt-1 pl-4">Gerencie as chaves de API e conexões seguras.</p>
            </div>
            
            {!isClientMode && (
               <div />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                  // Exibe skeletons enquanto carrega
                  <>
                    <CredentialSkeleton />
                    <CredentialSkeleton />
                    <CredentialSkeleton />
                  </>
              ) : visibleCredentials.length === 0 ? (
                  <div className="col-span-full py-12 text-center bg-muted/40 border border-dashed border-border rounded-xl animate-fade-in">
                      <Key className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">Nenhuma credencial detectada neste workflow.</p>
                  </div>
              ) : (
                  visibleCredentials.map(cred => {
                      const meta = credentialMeta[cred.id] || {};
                      const isHidden = meta.hidden === true;
                      const displayDescription = cred.nodeName || 'Conector Ativo';

                      return (
                        <SpotlightCard 
                            key={cred.id} 
                            onClick={() => handleEditCredential(cred)}
                            className={`
                                h-full group/card cursor-pointer hover:border-muted-foreground/40 animate-fade-in
                                ${isHidden ? 'border-dashed opacity-80' : ''}
                            `}
                        >
                            <div className="p-6 flex flex-col h-full relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 bg-muted border border-border rounded-lg flex items-center justify-center text-muted-foreground group-hover/card:bg-card group-hover/card:border-muted-foreground/40 transition-colors">
                                        <Key className="w-5 h-5" />
                                    </div>

                                    {!isClientMode && (
                                        <div className="flex items-center">
                                            {isHidden && (
                                                <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border font-bold uppercase tracking-wider mr-2">
                                                    Oculto
                                                </span>
                                            )}
                                            <button 
                                                onClick={(e) => handleToggleVisibility(e, cred.id)}
                                                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted opacity-0 group-hover/card:opacity-100"
                                                title={isHidden ? "Mostrar para Cliente" : "Ocultar do Cliente"}
                                            >
                                                {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-foreground truncate transition-colors" title={cred.name}>
                                        {cred.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-mono truncate" title={displayDescription}>
                                        {displayDescription}
                                    </p>
                                </div>
                            </div>
                        </SpotlightCard>
                      );
                  })
              )}
          </div>

          {selectedCredential && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/68 p-4 backdrop-blur-[1.5px] animate-fade-in">
                <div className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-[#101010] shadow-2xl animate-scale-in">
                    <CredentialForm 
                        workflowId={workflowId}
                        credentialType={selectedCredential.type}
                        credentialName={selectedCredential.name}
                        credentialId={selectedCredential.id}
                        credentialNodeName={selectedCredential.nodeName}
                        onSave={handleSaveCredential}
                        onCancel={() => setSelectedCredential(null)}
                    />
                </div>
            </div>
          )}
      </>
  );
};

