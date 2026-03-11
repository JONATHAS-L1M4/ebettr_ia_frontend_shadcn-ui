import React, { useEffect, useRef, useState } from 'react';
import { Agent, AccessRule, Company, ConfigSection, UserRole } from '../../types';
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Database,
  Globe,
  Key,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Zap
} from '../ui/Icons';
import { AccessManager } from '../inputs/AccessManager';
import { N8nWorkflow, fetchN8nWorkflowFullJson, fetchN8nWorkflows } from '../../services/n8nService';
import { companyService } from '../../services/companyService';
import { agentService } from '../../services/agentService';
import { useNotification } from '../../context/NotificationContext';
import Toggle from '../ui/Toggle';
import { DangerZoneSection } from '../shared/DangerZoneSection';

type AgentFormMode = 'create' | 'edit';

interface AgentFormProps {
  mode: AgentFormMode;
  existingAgents: Agent[];
  onSubmit: (agent: Agent) => Promise<void> | void;
  onCancel: () => void;
  agent?: Agent;
  onDelete?: () => void;
  userRole?: UserRole | null;
}

interface AgentFormState {
  name: string;
  description: string;
  client: string;
  companyId: string;
  email: string;
  phone: string;
  workflowName: string;
  workflowId: string;
  accessControl: AccessRule[];
  hasTestMode: boolean;
  testWebhookUrl: string;
  ragEnabled: boolean;
  ragUploadUrl: string;
  rag_storage_limit_mb: number;
  maintenance: boolean;
}

const createEmptyFormState = (overrides: Partial<AgentFormState> = {}): AgentFormState => ({
  name: '',
  description: '',
  client: '',
  companyId: '',
  email: '',
  phone: '',
  workflowName: '',
  workflowId: '',
  accessControl: [],
  hasTestMode: true,
  testWebhookUrl: '',
  ragEnabled: true,
  ragUploadUrl: '',
  rag_storage_limit_mb: 0,
  maintenance: false,
  ...overrides
});

const EditFormSkeleton = () => (
  <div className="animate-fade-in max-w-3xl mx-auto">
    <div className="flex items-center gap-4 mb-8 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-muted shrink-0"></div>
      <div className="space-y-2 w-full max-w-xs">
        <div className="h-6 bg-muted rounded w-1/2"></div>
        <div className="h-4 bg-muted rounded w-3/4"></div>
      </div>
    </div>
    <div className="bg-panel rounded-lg border border-border shadow-sm overflow-hidden animate-pulse">
      <div className="p-8 flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <div className="w-4 h-4 bg-muted rounded"></div>
            <div className="h-4 w-24 bg-muted rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-20 bg-muted rounded"></div>
            <div className="h-10 w-full bg-muted/40 rounded border border-border"></div>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-24 bg-muted rounded"></div>
            <div className="h-24 w-full bg-muted/40 rounded border border-border"></div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <div className="w-4 h-4 bg-muted rounded"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
          <div className="h-10 w-full bg-muted/40 rounded border border-border"></div>
        </div>
      </div>
      <div className="p-6 bg-muted/40 border-t border-border flex justify-end gap-3">
        <div className="h-9 w-20 bg-muted rounded"></div>
        <div className="h-9 w-36 bg-muted-foreground/30 rounded"></div>
      </div>
    </div>
  </div>
);

const getAgentWorkflowId = (agent: Agent): string | null => {
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

const getWorkflowSnapshot = (agent: Agent) => {
  let workflowName = '';
  let workflowId = agent.workflowId || '';

  agent.configSections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.id === 'n8n_workflow_name' && !workflowName) {
        workflowName = String(field.value);
      }
      if (field.id === 'n8n_workflow_id' && !workflowId) {
        workflowId = String(field.value);
      }
    });
  });

  return { workflowName, workflowId };
};

const createWorkflowSection = (workflowName: string, workflowId: string): ConfigSection => ({
  id: 'system_integration',
  title: 'Integracao de Sistema',
  description: 'Configuracao interna do workflow.',
  icon: 'database',
  fields: [
    { id: 'n8n_workflow_name', label: 'Nome do Workflow', type: 'text', value: workflowName, required: true },
    { id: 'n8n_workflow_id', label: 'ID do Workflow', type: 'text', value: workflowId, required: true }
  ]
});

const upsertWorkflowSection = (sections: ConfigSection[], workflowName: string, workflowId: string): ConfigSection[] => {
  let workflowUpdated = false;

  const nextSections = sections.map((section) => {
    let sectionHasWorkflow = false;
    const fields = section.fields.map((field) => {
      if (field.id === 'n8n_workflow_name') {
        sectionHasWorkflow = true;
        return { ...field, value: workflowName };
      }
      if (field.id === 'n8n_workflow_id') {
        sectionHasWorkflow = true;
        return { ...field, value: workflowId };
      }
      return field;
    });

    if (sectionHasWorkflow) {
      workflowUpdated = true;
    }

    return { ...section, fields };
  });

  if (!workflowUpdated && workflowId) {
    nextSections.push(createWorkflowSection(workflowName, workflowId));
  }

  return nextSections;
};

const resolveCompanyByName = (companies: Company[], name: string) =>
  companies.find((company) => company.name.toLowerCase() === name.trim().toLowerCase());

export const AgentForm: React.FC<AgentFormProps> = ({
  mode,
  existingAgents,
  onSubmit,
  onCancel,
  agent,
  onDelete,
  userRole
}) => {
  const { addNotification } = useNotification();
  const isEditMode = mode === 'edit';
  const isAdmin = isEditMode ? userRole === 'admin' : true;
  const currentAgent = isEditMode ? agent : undefined;

  const [formData, setFormData] = useState<AgentFormState>(createEmptyFormState());
  const [n8nWorkflows, setN8nWorkflows] = useState<N8nWorkflow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(isEditMode);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastAgentIdRef = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [formData.description, isInitialLoading]);

  const loadWorkflows = async (isManualRefresh = false) => {
    setIsLoadingWorkflows(true);
    setFetchError(false);

    try {
      const workflows = await fetchN8nWorkflows(isManualRefresh);
      setN8nWorkflows(workflows);

      if (isManualRefresh) {
        addNotification('success', 'Lista atualizada', `${workflows.length} workflows encontrados.`);
      }
    } catch (error: any) {
      setFetchError(true);

      if (isManualRefresh) {
        addNotification('error', 'Erro ao carregar', error.message || 'Nao foi possivel buscar workflows.');
      }
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined;

    const loadCompanies = async () => {
      try {
        const data = await companyService.list();
        if (mounted) {
          setCompanies(data);
        }
        return data;
      } catch (error) {
        console.warn('Failed to load company suggestions', error);
        return [] as Company[];
      }
    };

    const initializeCreateForm = async () => {
      setFormData(createEmptyFormState());
      setIsInitialLoading(false);
      await Promise.all([loadWorkflows(), loadCompanies()]);
    };

    const initializeEditForm = async () => {
      if (!currentAgent) {
        if (mounted) {
          setIsInitialLoading(false);
        }
        return;
      }

      const isSameAgent = lastAgentIdRef.current === currentAgent.id;
      if (!isSameAgent) {
        setIsInitialLoading(true);
      }

      const { workflowId, workflowName } = getWorkflowSnapshot(currentAgent);

      setFormData(
        createEmptyFormState({
          name: currentAgent.name,
          description: currentAgent.description,
          client: currentAgent.client || '',
          companyId: currentAgent.companyId || '',
          email: currentAgent.email || '',
          phone: currentAgent.phone || '',
          workflowName,
          workflowId,
          accessControl: currentAgent.accessControl || [],
          hasTestMode: currentAgent.hasTestMode !== undefined ? currentAgent.hasTestMode : true,
          testWebhookUrl: currentAgent.testWebhookUrl || '',
          ragEnabled: currentAgent.ragEnabled !== undefined ? currentAgent.ragEnabled : true,
          ragUploadUrl: currentAgent.ragUploadUrl || '',
          rag_storage_limit_mb: currentAgent.rag_storage_limit_mb || 0,
          maintenance: currentAgent.maintenance || false
        })
      );

      try {
        const [accessRules, workflowsData, companiesData] = await Promise.all([
          agentService.fetchVisibility(currentAgent.id),
          fetchN8nWorkflows(false),
          companyService.list()
        ]);

        if (!mounted) {
          return;
        }

        setN8nWorkflows(workflowsData);
        setCompanies(companiesData);
        setFetchError(false);

        let resolvedWorkflowName = workflowName;
        if (workflowId) {
          try {
            const workflowDetails = await fetchN8nWorkflowFullJson(workflowId);
            if (mounted && workflowDetails?.name) {
              resolvedWorkflowName = workflowDetails.name;
            }
          } catch (error) {
            console.warn('Could not fetch full workflow details', error);
            const foundWorkflow = workflowsData.find((workflow) => workflow.id === workflowId);
            if (foundWorkflow) {
              resolvedWorkflowName = foundWorkflow.name;
            }
          }
        }

        const resolvedCompany =
          (currentAgent.companyId && companiesData.find((company) => company.id === currentAgent.companyId)) ||
          resolveCompanyByName(companiesData, currentAgent.client || '');

        setFormData((previous) =>
          createEmptyFormState({
            ...previous,
            accessControl: accessRules,
            workflowName: resolvedWorkflowName || previous.workflowName,
            workflowId,
            client: resolvedCompany?.name || previous.client,
            companyId: resolvedCompany?.id || previous.companyId,
            email: resolvedCompany?.contactEmail || previous.email,
            phone: resolvedCompany?.contactPhone || previous.phone
          })
        );
      } catch (error) {
        console.warn('Failed to load some resources for edit form', error);
      } finally {
        if (!mounted) {
          return;
        }

        if (!isSameAgent) {
          loadingTimeout = setTimeout(() => {
            if (!mounted || !currentAgent) {
              return;
            }

            setIsInitialLoading(false);
            lastAgentIdRef.current = currentAgent.id;
          }, 600);
        } else if (currentAgent) {
          setIsInitialLoading(false);
          lastAgentIdRef.current = currentAgent.id;
        }
      }
    };

    if (isEditMode) {
      initializeEditForm();
    } else {
      initializeCreateForm();
    }

    return () => {
      mounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [currentAgent, isEditMode]);

  const filteredWorkflows = n8nWorkflows.filter((workflow) => {
    const term = String(formData.workflowName || '').toLowerCase();
    const name = String(workflow.name || '').toLowerCase();
    const id = String(workflow.id || '').toLowerCase();

    if (isEditMode) {
      return name.includes(term) || id.includes(term);
    }

    const isUsed = existingAgents.some((existingAgent) => getAgentWorkflowId(existingAgent) === workflow.id);
    return !isUsed && (name.includes(term) || id.includes(term));
  });

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(formData.client.toLowerCase())
  );

  const handleSelectWorkflow = (workflow: N8nWorkflow) => {
    setFormData((previous) => ({
      ...previous,
      workflowName: workflow.name,
      workflowId: workflow.id
    }));
    setIsDropdownOpen(false);
  };

  const handleSelectCompany = (company: Company) => {
    setFormData((previous) => ({
      ...previous,
      client: company.name,
      companyId: company.id,
      email: company.contactEmail || '',
      phone: company.contactPhone || ''
    }));
    setIsCompanyDropdownOpen(false);
  };

  const handleClientChange = (value: string) => {
    const matchedCompany = resolveCompanyByName(companies, value);

    setFormData((previous) => ({
      ...previous,
      client: value,
      companyId: matchedCompany?.id || '',
      email: matchedCompany?.contactEmail || '',
      phone: matchedCompany?.contactPhone || ''
    }));
    setIsCompanyDropdownOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isEditMode && !currentAgent) {
      return;
    }

    const currentAgentId = currentAgent?.id;
    const nameExists = existingAgents.some(
      (existingAgent) =>
        existingAgent.id !== currentAgentId &&
        existingAgent.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
    );

    if (nameExists) {
      addNotification('error', 'Nome duplicado', 'Ja existe um agente com este nome.');
      return;
    }

    if (formData.workflowId) {
      const workflowUsed = existingAgents.some((existingAgent) => {
        if (existingAgent.id === currentAgentId) {
          return false;
        }
        return getAgentWorkflowId(existingAgent) === formData.workflowId;
      });

      if (workflowUsed) {
        addNotification('error', 'Workflow em uso', 'Este workflow ja esta vinculado a outro agente.');
        return;
      }
    }

    const matchedCompany = formData.client ? resolveCompanyByName(companies, formData.client) : undefined;

    if (!isEditMode && formData.client && !matchedCompany) {
      addNotification(
        'error',
        'Empresa nao encontrada',
        'Apenas empresas previamente cadastradas podem ser vinculadas. Cadastre a empresa primeiro.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && currentAgent) {
        const updatedAgent: Agent = {
          ...currentAgent,
          name: formData.name,
          description: formData.description,
          client: formData.client,
          companyId: matchedCompany?.id || formData.companyId,
          workflowId: formData.workflowId,
          email: matchedCompany?.contactEmail || formData.email,
          phone: matchedCompany?.contactPhone || formData.phone,
          accessControl: formData.accessControl,
          hasTestMode: formData.hasTestMode,
          testWebhookUrl: formData.testWebhookUrl,
          ragEnabled: formData.ragEnabled,
          ragUploadUrl: formData.ragUploadUrl,
          rag_storage_limit_mb: formData.rag_storage_limit_mb,
          maintenance: formData.maintenance,
          allowAudio: true,
          allowAttachments: true,
          configSections: upsertWorkflowSection(
            [...currentAgent.configSections],
            formData.workflowName,
            formData.workflowId
          )
        };

        await onSubmit(updatedAgent);
        addNotification('success', 'Agente atualizado', 'Todas as alteracoes foram salvas.');
        return;
      }

      const configSections = formData.workflowId
        ? [createWorkflowSection(formData.workflowName, formData.workflowId)]
        : [];
      const accessEmails = formData.accessControl.map((rule) => rule.email).join(', ');

      const newAgent: Agent = {
        id: '',
        name: formData.name,
        description: formData.description,
        client: formData.client,
        companyId: matchedCompany?.id || formData.companyId,
        workflowId: formData.workflowId,
        email: matchedCompany?.contactEmail || formData.email,
        phone: matchedCompany?.contactPhone || formData.phone,
        active: false,
        avatarUrl: '',
        lastActive: '',
        configSections,
        accessControl: formData.accessControl,
        accessEmails,
        hasTestMode: formData.hasTestMode,
        testWebhookUrl: formData.testWebhookUrl,
        ragEnabled: formData.ragEnabled,
        ragUploadUrl: formData.ragUploadUrl,
        rag_storage_limit_mb: formData.rag_storage_limit_mb,
        maintenance: formData.maintenance,
        allowAudio: true,
        allowAttachments: true
      };

      await onSubmit(newAgent);
      addNotification('success', 'Agente criado', `O agente "${newAgent.name}" foi criado e vinculado ao workflow.`);
    } catch (error) {
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground';
  const readOnlyClass = 'bg-muted text-muted-foreground cursor-not-allowed select-none focus-visible:ring-0 border-border';

  if (isEditMode && !currentAgent) {
    return null;
  }

  if (isEditMode && isInitialLoading) {
    return <EditFormSkeleton />;
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-ring/40 hover:text-foreground text-muted-foreground transition-colors bg-card disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{isEditMode ? 'Editar Agente' : 'Novo Agente'}</h1>
          <p className="text-sm text-muted-foreground font-light">
            {isEditMode
              ? 'Atualize a identidade e o workflow do agente.'
              : 'Defina a identidade e o cerebro (Workflow) do agente.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-panel rounded-lg border border-border shadow-sm overflow-visible">
        <div className="p-8 flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
              <Brain className="w-3 h-3" /> Identidade
            </h3>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Nome da Automacao</label>
                <span className="text-[10px] text-muted-foreground font-mono">{formData.name.length}/60</span>
              </div>
              <input
                type="text"
                required
                maxLength={60}
                placeholder="Ex: Agente de Suporte L1"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className={inputClass}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Funcao da Automacao</label>
                <span className="text-[10px] text-muted-foreground font-mono">{formData.description.length}/300</span>
              </div>
              <textarea
                ref={descriptionRef}
                required
                maxLength={300}
                rows={3}
                placeholder="Descreva o proposito deste agente..."
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                className={`${inputClass} resize-none overflow-hidden`}
                style={{ minHeight: '80px' }}
                disabled={isSubmitting}
              />
            </div>

            <div className="pt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-1" ref={companyDropdownRef}>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Nome Cliente / Empresa</label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Selecione ou digite..."
                    value={formData.client}
                    onChange={(event) => handleClientChange(event.target.value)}
                    onFocus={() => setIsCompanyDropdownOpen(true)}
                    className={`${inputClass} pl-9`}
                    disabled={isSubmitting}
                  />
                  {isCompanyDropdownOpen && filteredCompanies.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-scale-in">
                      {filteredCompanies.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => handleSelectCompany(company)}
                          className="w-full text-left px-4 py-2 hover:bg-muted/40 text-sm text-foreground flex items-center justify-between transition-colors border-b border-border last:border-0"
                        >
                          <span className="font-medium">{company.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!isEditMode && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-1">
                    Apenas empresas cadastradas sao permitidas.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">E-mail de Contato</label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={formData.email}
                      readOnly
                      tabIndex={-1}
                      placeholder={formData.email ? '' : 'Vinculo automatico'}
                      className={`${inputClass} pl-9 ${readOnlyClass}`}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Telefone</label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      readOnly
                      tabIndex={-1}
                      placeholder={formData.phone ? '' : 'Vinculo automatico'}
                      className={`${inputClass} pl-9 ${readOnlyClass}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(mode === 'create' || isAdmin) && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
                <Key className="w-3 h-3" /> Gestao de Acesso
              </h3>

              <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Usuarios Permitidos</span>
                </div>

                <AccessManager
                  rules={formData.accessControl}
                  onChange={(rules) => setFormData({ ...formData, accessControl: rules })}
                  selectedCompany={formData.client}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Cerebro (Workflow)
            </h3>

            <div className="flex flex-col gap-1 relative z-50" ref={dropdownRef}>
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Selecionar Workflow</label>
                <button
                  type="button"
                  onClick={() => loadWorkflows(true)}
                  disabled={isLoadingWorkflows || isSubmitting}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Escanear novos workflows"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingWorkflows ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar workflow por nome ou ID..."
                  value={formData.workflowName}
                  onChange={(event) => {
                    setFormData((previous) => ({
                      ...previous,
                      workflowName: event.target.value,
                      workflowId: ''
                    }));
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className={`${inputClass} pr-8 ${formData.workflowId ? 'font-bold text-foreground' : ''}`}
                  disabled={isSubmitting}
                />
                <div className="absolute right-3 top-2.5 text-muted-foreground">
                  {isLoadingWorkflows ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </div>

                {isDropdownOpen && (
                  <div className="mt-1 bg-popover border border-border rounded-lg shadow-sm max-h-56 overflow-y-auto animate-scale-in w-full">
                    {fetchError && (
                      <div className="p-3 text-center text-destructive text-xs flex items-center justify-center gap-2">
                        <AlertCircle className="w-3 h-3" /> Erro ao carregar.
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            loadWorkflows(true);
                          }}
                          className="underline hover:text-destructive font-bold"
                        >
                          Tentar
                        </button>
                      </div>
                    )}

                    {!fetchError && !isLoadingWorkflows && filteredWorkflows.length === 0 && (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                        Nenhum workflow encontrado.
                      </div>
                    )}

                    {!fetchError &&
                      !isLoadingWorkflows &&
                      filteredWorkflows.length > 0 &&
                      filteredWorkflows.map((workflow) => (
                        <button
                          key={workflow.id}
                          type="button"
                          onClick={() => handleSelectWorkflow(workflow)}
                          className="w-full text-left px-4 py-2 hover:bg-muted/40 flex items-center justify-between group transition-colors border-b border-border last:border-0"
                        >
                          <div className="flex flex-col min-w-0 pr-3">
                            <span className="text-sm text-foreground group-hover:text-foreground font-medium truncate">
                              {workflow.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono truncate">#{workflow.id}</span>
                          </div>
                          <span
                            className={`text-[9px] font-bold ${
                              workflow.active ? 'text-foreground bg-muted/70' : 'text-muted-foreground bg-muted/40'
                            } px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0`}
                          >
                            {workflow.active ? 'Ativo' : 'Desativado'}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {formData.workflowId && (
                <div className="mt-2 text-[10px] text-muted-foreground font-mono bg-muted/40 p-2 rounded border border-border flex items-center gap-2">
                  <span className="font-bold text-muted-foreground">ID VINCULADO:</span> {formData.workflowId}
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-border flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Habilitar Base de Conhecimento (RAG)
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Permite que o agente utilize documentos para responder.
                  </p>
                </div>
                <Toggle
                  checked={formData.ragEnabled}
                  onChange={(value) => setFormData({ ...formData, ragEnabled: value })}
                  size="sm"
                />
              </div>
              {formData.ragEnabled && (
                <div className="flex flex-col gap-4 animate-fade-in bg-muted/30 p-4 rounded-lg border border-border">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">URL de Upload RAG</label>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      URL do endpoint para processamento de documentos.
                    </p>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 text-muted-foreground">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={formData.ragUploadUrl || ''}
                        onChange={(event) => setFormData({ ...formData, ragUploadUrl: event.target.value })}
                        className={`${inputClass} pl-9 bg-card`}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Limite de Armazenamento (MB)
                    </label>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Capacidade maxima de armazenamento para documentos RAG.
                    </p>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 text-muted-foreground flex items-center h-4">
                        <Database className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        min={1}
                        placeholder="Ex: 500"
                        value={formData.rag_storage_limit_mb || ''}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            rag_storage_limit_mb: parseInt(event.target.value, 10) || 0
                          })
                        }
                        className={`${inputClass} pl-9 bg-card`}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Habilitar Testes (Playground)
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Permite testar o comportamento do agente em tempo real.
                  </p>
                </div>
                <Toggle
                  checked={formData.hasTestMode}
                  onChange={(value) => setFormData({ ...formData, hasTestMode: value })}
                  size="sm"
                />
              </div>

              {formData.hasTestMode && (
                <div className="flex flex-col gap-4 animate-fade-in bg-muted/30 p-4 rounded-lg border border-border">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Webhook de Teste</label>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      URL do endpoint de webhook para o modo de teste.
                    </p>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 text-muted-foreground">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={formData.testWebhookUrl}
                        onChange={(event) => setFormData({ ...formData, testWebhookUrl: event.target.value })}
                        className={`${inputClass} pl-9 bg-card`}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted/40 border-t border-border flex items-center justify-end gap-3 z-0 relative">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!formData.workflowId || isSubmitting}
            className="h-10 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isEditMode ? (isSubmitting ? 'Salvando...' : 'Salvar Alteracoes') : 'Criar Agente'}
          </button>
        </div>
      </form>

      {isEditMode && onDelete && isAdmin && currentAgent && (
        <DangerZoneSection
          title="Excluir Agente"
          description={
            <>
              Esta acao excluira permanentemente o agente <strong>{currentAgent.name}</strong>.
            </>
          }
          actionLabel="Excluir Agente"
          onAction={onDelete}
        />
      )}
    </div>
  );
};
