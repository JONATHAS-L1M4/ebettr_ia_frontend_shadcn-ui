
import React, { useState, useEffect } from 'react';
import { ServerCredential, SupabaseServer } from '../types';
import { Server, Plus, Globe, Key, Edit2, Shield, Eye, EyeOff, Save, X, Terminal, CheckCircle2, Search, Loader2, Code, Copy, Database } from '../components/ui/Icons';
import { DashedAddCard } from '../components/ui/DashedAddCard';
import SpotlightCard from '../components/ui/SpotlightCard';
import Toggle from '../components/ui/Toggle';
import { useNotification } from '../context/NotificationContext';
import { inputBaseClass } from '../components/inputs/styles';
import { serverManagementService } from '../services/serverManagementService';
import { supabaseServerService } from '../services/supabaseServerService';
import { DeleteWithCodeModal } from '../components/shared/DeleteWithCodeModal';
import { DangerZoneSection } from '../components/shared/DangerZoneSection';
import DarkPage from '../components/layout/DarkPage';

const STORAGE_KEY = 'ebettr_servers';

interface AdminServersProps {
    onLogout?: () => void;
}

const ServerCardSkeleton = () => (
  <div className="h-full min-h-[200px] border border-border rounded-xl bg-card p-6 flex flex-col justify-between animate-pulse">
      <div className="flex justify-between items-start mb-3">
          <div className="w-10 h-10 bg-muted rounded-lg"></div>
          <div className="w-8 h-5 bg-muted rounded-full"></div>
      </div>
      <div className="flex-1 flex flex-col justify-start mt-2 space-y-3">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-3 bg-muted rounded w-2/3"></div>
          <div className="flex gap-2 mt-auto">
              <div className="h-6 w-20 bg-muted rounded"></div>
              <div className="h-6 w-16 bg-muted rounded"></div>
          </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border flex justify-between">
          <div className="h-3 bg-muted rounded w-16"></div>
          <div className="h-3 bg-muted rounded w-12"></div>
      </div>
  </div>
);

export const AdminServers: React.FC<AdminServersProps> = ({ onLogout }) => {
  const { addNotification } = useNotification();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'n8n' | 'supabase'>('n8n');

  // N8N State
  const [servers, setServers] = useState<ServerCredential[]>([]);
  
  // Supabase State
  const [supabaseServers, setSupabaseServers] = useState<SupabaseServer[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State (N8N)
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formCookie, setFormCookie] = useState('');
  const [formBrowserId, setFormBrowserId] = useState('');

  // Form State (Supabase)
  const [supaFormName, setSupaFormName] = useState('');
  const [supaFormUrl, setSupaFormUrl] = useState('');
  const [supaFormApiKey, setSupaFormApiKey] = useState('');

  // cURL Import State
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [curlInput, setCurlInput] = useState('');

  // Visibility States (Presence)
  const [showKey, setShowKey] = useState(false);
  const [showCookie, setShowCookie] = useState(false);
  const [showBrowserId, setShowBrowserId] = useState(false);

  // Visibility States (Masking)
  const [revealCookie, setRevealCookie] = useState(false);
  const [revealBrowserId, setRevealBrowserId] = useState(false);

  const isFetchingRef = React.useRef(false);
  
  const fetchServers = async () => {
      if (isFetchingRef.current) return;
      
      setIsLoading(true);
      isFetchingRef.current = true;
      try {
          if (activeTab === 'n8n') {
              const data = await serverManagementService.list();
              setServers(data);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } else {
              const data = await supabaseServerService.list();
              setSupabaseServers(data);
          }
      } catch (error: any) {
          console.error("Failed to fetch servers", error);
          
          if (activeTab === 'n8n') {
              // Fallback to local storage for N8N
              const saved = localStorage.getItem(STORAGE_KEY);
              if (saved) {
                  setServers(JSON.parse(saved));
                  if (!error.message.includes('Sessão expirada')) {
                      addNotification('warning', 'Modo Offline', 'Exibindo dados em cache local.');
                  }
              } else {
                  addNotification('error', 'Erro de Conexão', error.message || 'Não foi possível carregar a lista do servidor.');
              }
          } else {
              addNotification('error', 'Erro de Conexão', error.message || 'Não foi possível carregar a lista de servidores Supabase.');
          }
      } finally {
          setIsLoading(false);
          isFetchingRef.current = false;
      }
  };

  useEffect(() => {
    fetchServers();
  }, [activeTab]);

  const resetForm = () => {
    // N8N
    setFormName('');
    setFormUrl('');
    setFormApiKey('');
    setFormCookie('');
    setFormBrowserId('');
    
    // Supabase
    setSupaFormName('');
    setSupaFormUrl('');
    setSupaFormApiKey('');

    setEditingId(null);
    
    setShowKey(false);
    setShowCookie(false);
    setShowBrowserId(false);
    
    setRevealCookie(false);
    setRevealBrowserId(false);

    setIsFormOpen(false);
    setIsDeleteModalOpen(false);
    setShowCurlImport(false);
    setCurlInput('');
  };

  const handleEdit = (server: ServerCredential | SupabaseServer) => {
    if (activeTab === 'n8n') {
        const n8nServer = server as ServerCredential;
        setFormName(n8nServer.name);
        setFormUrl(n8nServer.url);
        setFormApiKey(n8nServer.apiKey);
        setFormCookie(n8nServer.cookie);
        setFormBrowserId(n8nServer.browserId);
        setEditingId(n8nServer.id);
        
        // Auto-show fields if they have content
        if (n8nServer.cookie) setShowCookie(true);
        if (n8nServer.browserId) setShowBrowserId(true);
    } else {
        const supaServer = server as SupabaseServer;
        setSupaFormName(supaServer.name);
        setSupaFormUrl(supaServer.url);
        setSupaFormApiKey(supaServer.api_key);
        setEditingId(supaServer.id);
    }
    
    // Reset reveal states on open
    setRevealCookie(false);
    setRevealBrowserId(false);
    setShowKey(false);

    setIsFormOpen(true);
  };

  const handleToggleActive = async (server: ServerCredential | SupabaseServer, isActive: boolean) => {
      if (activeTab === 'n8n') {
          const n8nServer = server as ServerCredential;
          // Atualização Otimista
          const originalServers = [...servers];
          setServers(prev => prev.map(s => s.id === n8nServer.id ? { ...s, isActive } : s));

          try {
              // O service já mapeia isActive -> is_active
              await serverManagementService.update(n8nServer.url, { isActive });
              addNotification('success', 'Status Atualizado', `${n8nServer.name} agora está ${isActive ? 'ativo' : 'inativo'}.`);
          } catch (error: any) {
              // Reverte em caso de erro
              setServers(originalServers);
              addNotification('error', 'Erro ao atualizar', error.message);
          }
      } else {
          const supaServer = server as SupabaseServer;
          // Atualização Otimista
          const originalServers = [...supabaseServers];
          setSupabaseServers(prev => prev.map(s => s.id === supaServer.id ? { ...s, is_active: isActive } : s));

          try {
              await supabaseServerService.update(supaServer.id, { is_active: isActive });
              addNotification('success', 'Status Atualizado', `${supaServer.name} agora está ${isActive ? 'ativo' : 'inativo'}.`);
          } catch (error: any) {
              // Reverte em caso de erro
              setSupabaseServers(originalServers);
              addNotification('error', 'Erro ao atualizar', error.message);
          }
      }
  };

  const handleConfirmDelete = async () => {
      if (!editingId) return;
      
      setIsDeleteModalOpen(false);
      setIsSubmitting(true);
      try {
          if (activeTab === 'n8n') {
              // Tenta encontrar o servidor original para pegar a URL correta (chave primária)
              const originalServer = servers.find(s => s.id === editingId);
              
              // Se não encontrar (ex: desincronia), usa a URL do formulário como fallback
              // A API usa a URL como identificador para exclusão
              const identifier = originalServer ? originalServer.url : (formUrl || editingId || '');

              await serverManagementService.delete(identifier);
              addNotification('info', 'Servidor removido', `O servidor ${formName} foi excluído.`);
          } else {
              await supabaseServerService.delete(editingId);
              addNotification('info', 'Servidor removido', `O servidor ${supaFormName} foi excluído.`);
          }
          await fetchServers();
          resetForm();
      } catch (error: any) {
          addNotification('error', 'Erro', error.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'n8n') {
        if (!formName || !formUrl || !formApiKey) {
            addNotification('error', 'Campos obrigatórios', 'Preencha Nome, URL e API Key.');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            name: formName,
            url: formUrl,
            apiKey: formApiKey,
            cookie: formCookie,
            browserId: formBrowserId,
            isActive: true
        };

        try {
            if (editingId) {
                const originalServer = servers.find(s => s.id === editingId);
                const identifier = originalServer ? originalServer.url : (formUrl || editingId || '');

                await serverManagementService.update(identifier, payload);
                addNotification('success', 'Servidor atualizado', `As credenciais de ${formName} foram salvas.`);
            } else {
                await serverManagementService.create(payload);
                addNotification('success', 'Servidor adicionado', `${formName} foi registrado na nuvem.`);
            }
            await fetchServers();
            resetForm();
        } catch (error: any) {
            addNotification('error', 'Erro ao salvar', error.message);
        } finally {
            setIsSubmitting(false);
        }
    } else {
        // SUPABASE SUBMIT
        if (!supaFormName || !supaFormUrl || !supaFormApiKey) {
            addNotification('error', 'Campos obrigatórios', 'Preencha Nome, URL e API Key.');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            name: supaFormName,
            url: supaFormUrl,
            api_key: supaFormApiKey,
            is_active: true
        };

        try {
            if (editingId) {
                await supabaseServerService.update(editingId, payload);
                addNotification('success', 'Servidor atualizado', `As credenciais de ${supaFormName} foram salvas.`);
            } else {
                await supabaseServerService.create(payload);
                addNotification('success', 'Servidor RAG adicionado', `${supaFormName} foi registrado.`);
            }
            
            await fetchServers();
            resetForm();
        } catch (error: any) {
            addNotification('error', 'Erro ao salvar', error.message);
        } finally {
            setIsSubmitting(false);
        }
    }
  };

  const handleProcessCurl = () => {
      if (!curlInput) return;

      let cookieFound = '';
      let browserIdFound = '';

      // Tenta capturar browser-id
      // Procura por: -H 'browser-id: valor' ou -H "browser-id: valor"
      const browserIdRegex = /-H\s+['"]browser-id:\s*([^'"]+)['"]/i;
      const bMatch = curlInput.match(browserIdRegex);
      if (bMatch) browserIdFound = bMatch[1];

      // Tenta capturar cookie via -b
      // Procura por: -b 'valor' ou --cookie "valor"
      const cookieFlagRegex = /(?:-b|--cookie)\s+['"]([^'"]+)['"]/i;
      const cFlagMatch = curlInput.match(cookieFlagRegex);
      if (cFlagMatch) {
          cookieFound = cFlagMatch[1];
      } else {
          // Fallback: Cookie no header
          const cookieHeaderRegex = /-H\s+['"]Cookie:\s*([^'"]+)['"]/i;
          const cHeaderMatch = curlInput.match(cookieHeaderRegex);
          if (cHeaderMatch) cookieFound = cHeaderMatch[1];
      }

      if (cookieFound || browserIdFound) {
          if (cookieFound) {
              setFormCookie(cookieFound);
              setShowCookie(true);
          }
          if (browserIdFound) {
              setFormBrowserId(browserIdFound);
              setShowBrowserId(true);
          }
          addNotification('success', 'Processado', 'Credenciais importadas do cURL.');
          setShowCurlImport(false);
          setCurlInput('');
      } else {
          addNotification('warning', 'Nada encontrado', 'Verifique se copiou o comando cURL completo.');
      }
  };

  // Filter Logic
  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- RENDER FORM ---
  if (isFormOpen) {
    return (
      <DarkPage className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto animate-fade-in pb-12">
        <div className="flex items-center gap-4 mb-8">
           <button 
             onClick={resetForm}
             className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-border hover:text-foreground text-muted-foreground transition-colors bg-card"
           >
             <X className="w-4 h-4" />
           </button>
           <div>
             <h1 className="text-xl font-bold text-foreground">
                {editingId ? 'Editar Servidor' : 'Novo Servidor'} {activeTab === 'supabase' ? 'RAG' : ''}
             </h1>
             <p className="text-sm text-muted-foreground font-light">
                {activeTab === 'n8n' 
                    ? 'Configure as credenciais de acesso ao n8n.' 
                    : 'Configure as credenciais do Supabase para RAG.'}
             </p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel rounded-lg border border-border shadow-sm overflow-hidden">
           
           {/* cURL Import Section - ONLY FOR N8N */}
           {activeTab === 'n8n' && (
               <div className="border-b border-border bg-muted p-4">
                   <button 
                       type="button"
                       onClick={() => setShowCurlImport(!showCurlImport)}
                       className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors"
                   >
                       <Terminal className="w-4 h-4" />
                       {showCurlImport ? 'Ocultar Importação' : 'Importar Rápida via cURL'}
                   </button>
                   
                   {showCurlImport && (
                       <div className="mt-3 animate-fade-in">
                           <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                               Cole o comando cURL copiado do navegador (DevTools &gt; Network &gt; Copy as cURL).<br/>
                               O sistema extrairá automaticamente <strong>Cookie (-b)</strong> e <strong>browser-id</strong>.
                           </p>
                           <textarea 
                               value={curlInput}
                               onChange={(e) => setCurlInput(e.target.value)}
                               className="w-full h-24 p-3 text-xs font-mono bg-background text-foreground rounded-md border border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none shadow-inner placeholder:text-muted-foreground"
                               placeholder={`curl 'https://n8n.exemplo.com/...' \n  -H 'browser-id: ...' \n  -b 'n8n-auth=...; ...'`}
                           />
                           <div className="flex justify-end mt-2">
                               <button 
                                   type="button"
                                   onClick={handleProcessCurl}
                                   disabled={!curlInput}
                                   className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded hover:bg-primary transition-colors disabled:opacity-50 flex items-center gap-2"
                               >
                                   <Code className="w-3 h-3" /> Processar Dados
                               </button>
                           </div>
                       </div>
                   )}
               </div>
           )}

           <div className="p-8 space-y-6">
              
              {/* --- N8N FIELDS --- */}
              {activeTab === 'n8n' && (
                  <>
                    {/* Identity */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome Identificador</label>
                        <input 
                            type="text" 
                            value={formName} 
                            onChange={e => setFormName(e.target.value)} 
                            className={inputBaseClass}
                            placeholder="Ex: Servidor Produção #1"
                            autoFocus
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* URL */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5" /> URL_N8N
                        </label>
                        <input 
                            type="url" 
                            value={formUrl} 
                            onChange={e => setFormUrl(e.target.value)} 
                            className={inputBaseClass}
                            placeholder="https://n8n.seu-dominio.com/api/v1/"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* API Key */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <Key className="w-3.5 h-3.5" /> X_N8N_API_KEY
                        </label>
                        <div className="relative">
                            <input 
                                type={showKey ? "text" : "password"} 
                                value={formApiKey} 
                                onChange={e => setFormApiKey(e.target.value)} 
                                className={`${inputBaseClass} pr-10 font-mono`}
                                placeholder="n8n_api_..."
                                disabled={isSubmitting}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Cookie */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" /> Cookie
                            </label>
                        </div>
                        
                        <div className="relative animate-fade-in">
                            <input 
                                type={revealCookie ? "text" : "password"}
                                value={formCookie} 
                                onChange={e => setFormCookie(e.target.value)} 
                                className={`${inputBaseClass} pr-10 font-mono text-xs`}
                                placeholder="n8n-auth=..."
                                disabled={isSubmitting}
                            />
                            <button 
                                type="button"
                                onClick={() => setRevealCookie(!revealCookie)}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                {revealCookie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Extraído do parâmetro <code>-b</code> ou header <code>Cookie</code>.</p>
                    </div>

                    {/* Browser ID */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                <Terminal className="w-3.5 h-3.5" /> Browser ID
                            </label>
                        </div>

                        <div className="relative animate-fade-in">
                            <input 
                                type={revealBrowserId ? "text" : "password"}
                                value={formBrowserId} 
                                onChange={e => setFormBrowserId(e.target.value)} 
                                className={`${inputBaseClass} pr-10 font-mono text-xs`}
                                placeholder="Mozilla/5.0... ou UUID"
                                disabled={isSubmitting}
                            />
                            <button 
                                type="button"
                                onClick={() => setRevealBrowserId(!revealBrowserId)}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                {revealBrowserId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Prioriza o header <code>browser-id</code> se disponível.</p>
                    </div>
                  </>
              )}

              {/* --- SUPABASE FIELDS --- */}
              {activeTab === 'supabase' && (
                  <>
                    {/* Identity */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome Identificador</label>
                        <input 
                            type="text" 
                            value={supaFormName} 
                            onChange={e => setSupaFormName(e.target.value)} 
                            className={inputBaseClass}
                            placeholder="Ex: Servidor RAG #1"
                            autoFocus
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* URL */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5" /> URL Supabase
                        </label>
                        <input 
                            type="url" 
                            value={supaFormUrl} 
                            onChange={e => setSupaFormUrl(e.target.value)} 
                            className={inputBaseClass}
                            placeholder="https://seu-projeto.supabase.co"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* API Key */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <Key className="w-3.5 h-3.5" /> API Key (Service Role / Anon)
                        </label>
                        <div className="relative">
                            <input 
                                type={showKey ? "text" : "password"} 
                                value={supaFormApiKey} 
                                onChange={e => setSupaFormApiKey(e.target.value)} 
                                className={`${inputBaseClass} pr-10 font-mono`}
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                disabled={isSubmitting}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                  </>
              )}

           </div>

           <div className="p-6 bg-muted border-t border-border flex items-center justify-end gap-3">
               <button 
                 type="button"
                 onClick={resetForm}
                 disabled={isSubmitting}
                 className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors disabled:opacity-50"
               >
                 Cancelar
               </button>
               <button 
                 type="submit"
                 disabled={isSubmitting}
                 className="h-10 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {isSubmitting ? 'Salvando...' : 'Salvar Servidor'}
               </button>
           </div>
        </form>

        {/* DANGER ZONE */}
        {editingId && (
            <DangerZoneSection
                title="Excluir Servidor"
                description={
                    <>
                        Esta ação removerá permanentemente as credenciais de <strong>{activeTab === 'n8n' ? formName : supaFormName}</strong> da nuvem.
                    </>
                }
                actionLabel="Excluir Servidor"
                loadingLabel="Excluindo..."
                onAction={() => setIsDeleteModalOpen(true)}
                disabled={isSubmitting}
                isLoading={isSubmitting}
            />
        )}

        <DeleteWithCodeModal 
            isOpen={isDeleteModalOpen}
            title="Excluir Servidor?"
            description={<>Tem certeza que deseja excluir <strong>{activeTab === 'n8n' ? formName : supaFormName}</strong>? Esta ação é irreversível.</>}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleConfirmDelete}
        />
      </div>
      </DarkPage>
    );
  }

  // --- RENDER LIST ---
  return (
    <DarkPage className="min-h-[calc(100vh-4rem)]">
    <div className="animate-fade-in max-w-7xl mx-auto pb-12">
        
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-4 mb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-border rounded-lg flex items-center justify-center text-foreground bg-muted">
                        <Server className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">
                            Gerenciar Servidores
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5 font-light">
                            Lista de instâncias N8N e credenciais de acesso.
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-64">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-foreground">
                            <Search className="w-4 h-4" />
                        </div>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground pl-10 h-9" 
                            placeholder="Buscar servidor..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {(activeTab === 'n8n' || activeTab === 'supabase') && (
                        <button 
                            onClick={() => setIsFormOpen(true)}
                            className="flex h-10 items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 rounded-md text-xs font-bold uppercase tracking-wide transition-all border border-transparent whitespace-nowrap shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Novo Servidor</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 mt-2">
                <button
                    onClick={() => setActiveTab('n8n')}
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'n8n' 
                        ? 'border-primary text-foreground' 
                        : 'border-transparent text-muted-foreground hover:text-muted-foreground'
                    }`}
                >
                    Servidores n8n
                </button>
                <button
                    onClick={() => setActiveTab('supabase')}
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'supabase' 
                        ? 'border-primary text-foreground' 
                        : 'border-transparent text-muted-foreground hover:text-muted-foreground'
                    }`}
                >
                    Servidores RAG (Supabase)
                </button>
            </div>
        </div>

        {/* Loading State */}
        {isLoading && ((activeTab === 'n8n' && servers.length === 0) || (activeTab === 'supabase' && supabaseServers.length === 0)) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                {[1, 2, 3].map((i) => <ServerCardSkeleton key={i} />)}
            </div>
        ) : (
            /* Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                
                {/* N8N SERVERS LIST */}
                {activeTab === 'n8n' && (
                    <>
                        {filteredServers.map(server => (
                            <SpotlightCard 
                                key={server.id} 
                                onClick={() => handleEdit(server)}
                                className={`h-full min-h-[200px] cursor-pointer group border-border hover:border-border ${!server.isActive ? 'opacity-75' : ''}`}
                            >
                                <div className="flex flex-col justify-between h-full p-6">
                                    
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors border-border bg-muted text-foreground`}>
                                            <Server className="w-5 h-5" />
                                        </div>
                                        
                                        {/* Toggle in Top Right */}
                                        <div onClick={(e) => e.stopPropagation()} className="relative z-20">
                                            <Toggle 
                                                checked={server.isActive || false}
                                                onChange={(checked) => handleToggleActive(server, checked)}
                                                size="sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-start mt-2">
                                        <div className="mb-1">
                                            <h3 className={`text-sm font-bold tracking-tight truncate ${server.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {server.name}
                                            </h3>
                                        </div>
                                        
                                        {/* URL Display */}
                                        <div className="flex items-center gap-1.5 text-muted-foreground mb-3" title={server.url}>
                                            <Globe className="w-3 h-3 shrink-0" />
                                            <span className="text-xs truncate font-mono">{server.url}</span>
                                        </div>

                                        {/* Keys/Info Chips */}
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            <div className="bg-muted px-2 py-1 rounded border border-border flex items-center gap-1.5 max-w-full">
                                                <Key className="w-3 h-3 text-muted-foreground shrink-0" />
                                                <span className="text-[10px] font-mono text-muted-foreground truncate">••••{server.apiKey.slice(-4)}</span>
                                            </div>
                                            {server.browserId && (
                                                <div className="bg-muted px-2 py-1 rounded border border-border flex items-center gap-1.5 max-w-full">
                                                    <Terminal className="w-3 h-3 text-muted-foreground shrink-0" />
                                                    <span className="text-[10px] font-mono text-muted-foreground truncate">ID Config</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
                                        {server.isActive ? (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Online</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Inativo</span>
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Sincronizado na nuvem">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Cloud</span>
                                        </div>
                                    </div>
                                </div>
                            </SpotlightCard>
                        ))}

                        <DashedAddCard 
                            label="Adicionar Servidor" 
                            onClick={() => setIsFormOpen(true)} 
                            icon={Server}
                            className="min-h-[200px]"
                        />
                    </>
                )}

                {/* SUPABASE SERVERS LIST */}
                {activeTab === 'supabase' && (
                    <>
                        {supabaseServers.map(server => (
                            <SpotlightCard 
                                key={server.id} 
                                onClick={() => handleEdit(server)}
                                className={`h-full min-h-[200px] cursor-pointer group border-border hover:border-border ${!server.is_active ? 'opacity-75' : ''}`}
                            >
                                <div className="flex flex-col justify-between h-full p-6">
                                    
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors border-border bg-muted text-foreground`}>
                                            <Database className="w-5 h-5" />
                                        </div>
                                        
                                        {/* Toggle in Top Right */}
                                        <div onClick={(e) => e.stopPropagation()} className="relative z-20">
                                            <Toggle 
                                                checked={server.is_active || false}
                                                onChange={(checked) => handleToggleActive(server, checked)}
                                                size="sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-start mt-2">
                                        <div className="mb-1">
                                            <h3 className="text-sm font-bold tracking-tight truncate text-foreground">
                                                {server.name}
                                            </h3>
                                        </div>
                                        
                                        {/* URL Display */}
                                        <div className="flex items-center gap-1.5 text-muted-foreground mb-3" title={server.url}>
                                            <Globe className="w-3 h-3 shrink-0" />
                                            <span className="text-xs truncate font-mono">{server.url}</span>
                                        </div>

                                        {/* Info Chips */}
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {/* Removed default_table_name display */}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <span className="text-[10px]">Criado em {new Date(server.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </SpotlightCard>
                        ))}

                        <DashedAddCard 
                            label="Novo Servidor RAG" 
                            onClick={() => setIsFormOpen(true)} 
                            icon={Database}
                            className="min-h-[200px]"
                        />
                    </>
                )}
            </div>
        )}
    </div>
    </DarkPage>
  );
};
