
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { SidebarInset, SidebarProvider } from './components/ui/sidebar';
import { Header } from './components/layout/Header';
import Login from './pages/Login';
import AgentList from './pages/AgentList';
import AgentDetail from './pages/AgentDetail';
import { ProfilePage } from './pages/ProfilePage';
import { AdminServers } from './pages/AdminServers';
import { AdminUsers } from './pages/AdminUsers'; 
import { ClientUsers } from './pages/ClientUsers';
import { Companies } from './pages/Companies';
import { AdminSessions } from './pages/AdminSessions';
import { AdminAlerts } from './pages/AdminAlerts';
import { AdminExecutionMetrics } from './pages/AdminExecutionMetrics';
import { UserProfile } from './types';
import { useAppData } from './hooks/useAppData';
import { Ban, ArrowLeft, Loader2 } from './components/ui/Icons';
import { authService } from './services/authService';
import { GoogleAnalytics } from './components/shared/GoogleAnalytics';
import { SESSION_EXPIRED_EVENT } from './services/apiUtils';
import { useNotification } from './context/NotificationContext';
import { NotFound } from './pages/NotFound';
import { darkTheme } from './design-tokens';


const USER_CACHE_KEY = 'ebettr_user_cache';

import SupportChat from './pages/SupportChat';

import { GlobalAlerts } from './components/layout/GlobalAlerts';

// Wrapper component to handle AgentDetail logic
const AgentDetailWrapper = ({ agents, currentUser, isLoading, onBack, onUpdateAgent, onDeleteAgent, onRefresh }: any) => {
    const { agentId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') || undefined;
    
    const agent = agents.find((a: any) => a.id === agentId || a.workflowId === agentId);

    // 2. Redirecionamento Automático se não encontrar o agente
    useEffect(() => {
        if (!agent && !isLoading) {
            navigate('/agents');
        }
    }, [agent, isLoading, navigate]);

    // 1. Estado de Carregamento
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!agent) return null;

    // Security Check: Blocked Agents
    if (agent.isBlocked && currentUser.role?.toLowerCase().trim() !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/12 text-destructive">
                    <Ban className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
                <p className="mt-2 max-w-md text-muted-foreground">
                    O acesso a este agente foi suspenso administrativamente. Por favor, entre em contato com o suporte para mais informações.
                </p>
                <button 
                onClick={onBack}
                className="mt-6 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                <ArrowLeft className="w-4 h-4" /> Voltar para lista
                </button>
            </div>
        );
    }

    const handleTabChange = (newTab: string) => {
        setSearchParams({ tab: newTab });
    };

    return (
        <AgentDetail
            agent={agent}
            allAgents={agents}
            onBack={onBack}
            onUpdateAgent={onUpdateAgent}
            onDeleteAgent={onDeleteAgent}
            onRefresh={onRefresh}
            userRole={currentUser.role?.toLowerCase().trim()}
            initialTab={tab}
            onTabChange={handleTabChange}
        />
    );
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const darkStyle = { ...(darkTheme as React.CSSProperties), colorScheme: 'dark' as const };

  // 1. Inicializa o currentUser lendo do LocalStorage para persistir no F5
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
      try {
          const saved = localStorage.getItem(USER_CACHE_KEY);
          return saved ? JSON.parse(saved) : null;
      } catch (e) {
          return null;
      }
  });

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { agents, isLoading, handleToggleAgent, handleUpdateAgent, handleCreateAgent, handleDeleteAgent, handleBlockAgent, handleMaintenanceAgent, refreshAgents } = useAppData();
  const { addNotification } = useNotification();

  const handleLogout = React.useCallback(async () => {
    await authService.logout();
    localStorage.removeItem(USER_CACHE_KEY);
    setCurrentUser(null);
    navigate('/login');
  }, [navigate]);

  // Global Session Expiration Listener
  useEffect(() => {
    const handleSessionExpired = () => {
        // Evita múltiplas notificações se várias requisições falharem ao mesmo tempo
        if (localStorage.getItem('ebettr_access_token')) {
            addNotification('warning', 'Sessão Expirada', 'Você será redirecionado para o login.');
            setTimeout(() => {
                handleLogout();
            }, 1500);
        }
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [addNotification, handleLogout]);

  // Verifica sessão ao iniciar e ao mudar de rota (Validação em Background)
  const isValidatingRef = React.useRef(false);
  useEffect(() => {
    const validateSession = async () => {
        if (isValidatingRef.current) return;
        
        const token = localStorage.getItem('ebettr_access_token');
        
        if (!token) {
            if (currentUser) {
                handleLogout();
            }
            setIsAuthLoading(false);
            return;
        }

        // Se já temos currentUser e não é o primeiro load, apenas verifica se o token ainda é válido
        // Evita recarregar o perfil completo a cada navegação se já estiver em memória
        if (currentUser && !isAuthLoading) {
             return;
        }

        isValidatingRef.current = true;
        try {
            const profile = await authService.getProfile();
            setCurrentUser(profile);
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
        } catch (e) {
            console.warn('Sessão inválida ou expirada', e);
            handleLogout();
        } finally {
            setIsAuthLoading(false);
            isValidatingRef.current = false;
        }
    };
    
    validateSession();
  }, [location.pathname, currentUser, isAuthLoading, handleLogout]); // Executa na mudança de rota

  // Carregamento de Agentes - Centralizado para evitar duplicidade
  useEffect(() => {
    const isAgentsPath = location.pathname === '/agents';
    const isAgentDetailPath = location.pathname.startsWith('/agents/');
    
    if ((isAgentsPath || isAgentDetailPath) && currentUser && !isAuthLoading) {
        refreshAgents();
    }
  }, [location.pathname, currentUser, isAuthLoading, refreshAgents]);

  const handleLogin = async () => {
    try {
        const profile = await authService.getProfile();
        setCurrentUser(profile);
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile)); 
        navigate('/agents');
    } catch (e) {
        console.error("Erro ao carregar perfil após login", e);
    }
  };

  const handleUpdateProfile = (updatedUser: Partial<UserProfile>) => {
    setCurrentUser(prevUser => {
        if (!prevUser) return null;
        const newUser = { ...prevUser, ...updatedUser };
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(newUser));
        return newUser;
    });
  };

  const onAgentCreated = async (agent: any) => {
      const createdAgent = await handleCreateAgent(agent); 
      if (createdAgent && createdAgent.id) {
          navigate(`/agents/${createdAgent.id}`);
      }
  };

  const onAgentDeleted = (id: string) => {
      // Pass dummy navState as it's no longer used inside handleDeleteAgent logic for navigation
      handleDeleteAgent(id, { view: 'agent-detail' }, () => {
          navigate('/agents');
          return null;
      });
  };

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isAuthLoading) {
      return (
        <SidebarProvider className="h-screen bg-background overflow-hidden font-sans text-foreground" style={darkStyle}>
          <Sidebar
            userRole={null}
            currentUser={null}
            allAgents={[]}
            onLogout={handleLogout}
            isLoading={true}
          />
          <SidebarInset className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full bg-background text-foreground">
              <div className="flex h-full items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
          </SidebarInset>
        </SidebarProvider>
      );
  }

  // Se não estiver logado e não estiver na página de login, redireciona
  if (!currentUser && location.pathname !== '/login') {
      return <Navigate to="/login" replace />;
  }

  // Se estiver na página de login, renderiza apenas o Login
  if (location.pathname === '/login') {
      if (currentUser) {
          return <Navigate to="/agents" replace />;
      }
      return <Login onLogin={handleLogin} />;
  }

  const normalizedRole = currentUser?.role?.toLowerCase().trim();

  return (
    <SidebarProvider className="h-screen bg-background overflow-hidden font-sans text-foreground" style={darkStyle}>
      <GoogleAnalytics />
      <Sidebar
        userRole={normalizedRole as any}
        currentUser={currentUser}
        allAgents={agents}
        onLogout={handleLogout}
        isLoading={isLoading}
      />

      <SidebarInset className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full bg-background text-foreground">
        <GlobalAlerts userRole={normalizedRole as any} />
        <Header />

        <main className="flex-1 p-4 md:p-8 scroll-smooth bg-background text-foreground">
            <Routes>
                <Route path="/" element={<Navigate to="/agents" replace />} />
                
                <Route path="/agents" element={
                    <AgentList
                        agents={filteredAgents}
                        onSelectAgent={(id) => {
                            const agent = agents.find(a => a.id === id);
                            navigate(`/agents/${agent?.workflowId || id}`);
                        }}
                        onToggleAgent={handleToggleAgent}
                        onBlockAgent={handleBlockAgent}
                        onMaintenanceAgent={handleMaintenanceAgent}
                        onCreateAgent={onAgentCreated}
                        userRole={normalizedRole as any}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        isLoading={isLoading}
                    />
                } />

                <Route path="/agents/:agentId" element={
                    <AgentDetailWrapper 
                        agents={agents} 
                        currentUser={currentUser!} 
                        isLoading={isLoading}
                        onBack={() => navigate('/agents')}
                        onUpdateAgent={handleUpdateAgent}
                        onDeleteAgent={onAgentDeleted}
                        onRefresh={refreshAgents}
                    />
                } />

                <Route path="/support-chat" element={<SupportChat />} />

                <Route path="/profile" element={
                    <ProfilePage
                        user={currentUser!}
                        onSave={handleUpdateProfile}
                        onBack={() => navigate('/agents')}
                    />
                } />

                {normalizedRole === 'admin' && (
                    <>
                        <Route path="/admin/servers" element={<AdminServers onLogout={handleLogout} />} />
                        <Route path="/admin/users" element={<AdminUsers currentUserEmail={currentUser!.email} />} />
                        <Route path="/admin/clients" element={<ClientUsers />} />
                        <Route path="/admin/companies" element={<Companies />} />
                        <Route path="/admin/sessions" element={<AdminSessions onLogout={handleLogout} />} />
                        <Route path="/admin/alerts" element={<AdminAlerts />} />
                    </>
                )}

                {(normalizedRole === 'admin' || normalizedRole === 'support') && (
                    <Route path="/admin/workflows/execution-metrics" element={<AdminExecutionMetrics />} />
                )}

                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
