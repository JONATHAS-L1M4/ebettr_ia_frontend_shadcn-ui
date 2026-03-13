import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Box,
  Building2,
  Headset,
  Lock,
  MoreVertical,
  Server,
  Shield,
  User,
  Users
} from '../ui/Icons';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '../ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Agent, UserRole } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { cn } from '../../utils/cn';
import { ConfirmationModal } from '../shared/ConfirmationModal';

interface SidebarProps {
  userRole: UserRole | null;
  currentUser?: { name: string; email: string; role: any; avatarUrl?: string } | null;
  allAgents: Agent[];
  onLogout: () => void;
  isLoading?: boolean;
}

interface NavigationItem {
  key: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userRole,
  currentUser,
  allAgents,
  onLogout,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotification();
  const { isMobile, setOpenMobile } = useSidebar();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const normalizedRole = userRole?.toLowerCase().trim();
  const currentPath = location.pathname;
  const isAdmin = normalizedRole === 'admin';
  const canViewMetrics = normalizedRole === 'admin' || normalizedRole === 'support';

  const appItems = useMemo<NavigationItem[]>(() => {
    const baseItems: NavigationItem[] = [
      { key: 'agents', label: 'Todos Agentes', path: '/agents', icon: Box },
      { key: 'support', label: 'Suporte', path: '/support-chat', icon: Headset }
    ];

    if (canViewMetrics) {
      baseItems.splice(1, 0, {
        key: 'metrics',
        label: 'Metricas de Execucao',
        path: '/admin/workflows/execution-metrics',
        icon: BarChart3
      });
    }

    return baseItems;
  }, [canViewMetrics]);

  const adminItems = useMemo<NavigationItem[]>(() => {
    if (!isAdmin) return [];

    return [
      { key: 'servers', label: 'Servidores', path: '/admin/servers', icon: Server },
      { key: 'companies', label: 'Empresas / Grupos', path: '/admin/companies', icon: Building2 },
      { key: 'admins', label: 'Usuarios Admins', path: '/admin/users', icon: Users },
      { key: 'clients', label: 'Usuarios Clientes', path: '/admin/clients', icon: User },
      { key: 'sessions', label: 'Sessoes e Logins', path: '/admin/sessions', icon: Shield },
      { key: 'alerts', label: 'Alertas', path: '/admin/alerts', icon: AlertTriangle }
    ];
  }, [isAdmin]);

  const getRoleBadge = () => {
    switch (normalizedRole) {
      case 'client':
        return 'CL';
      case 'support':
        return 'SP';
      case 'editor':
        return 'ED';
      case 'admin':
      default:
        return 'AD';
    }
  };

  const getInitials = () => {
    if (!currentUser?.name) return getRoleBadge();
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length === 0) return getRoleBadge();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const displayName = currentUser?.name || 'Usuario';
  const displayInitials = getInitials();
  const renderStaticSkeleton = (widthClass: string) => (
    <div className="flex h-8 items-center gap-2 rounded-md px-2">
      <div className="h-4 w-4 shrink-0 rounded bg-sidebar-accent/40" />
      <div className={cn('h-3 rounded bg-sidebar-accent/40', widthClass)} />
    </div>
  );

  const closeIfMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    closeIfMobile();
  };

  const handleAgentClick = (agent: Agent) => {
    if (agent.isBlocked && normalizedRole !== 'admin') {
      addNotification(
        'warning',
        'Acesso Restrito',
        'Este agente esta temporariamente indisponivel. Contate o administrador.'
      );
      return;
    }

    navigate(`/agents/${agent.id}`);
    closeIfMobile();
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const isPathActive = (path: string) => {
    if (path === '/agents') return currentPath === '/' || currentPath === '/agents';
    return currentPath === path;
  };

  return (
    <>
      <SidebarRoot collapsible="none">
        <SidebarHeader className="pb-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex min-w-0 items-center gap-3 mt-2">
              <img
                src="http://img.ebettr.com/images/2026/03/06/favicon.png"
                alt="Ebettr IA"
                className="h-8 w-auto object-contain"
              />
              <div className="grid min-w-0 text-left text-sm leading-tight">
                <span className="truncate font-medium">Ebettr IA</span>
                <span className="truncate text-[11px] text-sidebar-foreground/70">Workspace</span>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading && !currentUser
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <SidebarMenuItem key={`loading-app-${index}`}>
                        {renderStaticSkeleton('w-20')}
                      </SidebarMenuItem>
                    ))
                  : appItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isPathActive(item.path);

                      return (
                        <SidebarMenuItem key={item.key}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => handleNavClick(item.path)}
                            tooltip={item.label}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {adminItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Administracao</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoading && !currentUser
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <SidebarMenuItem key={`loading-admin-${index}`}>
                          {renderStaticSkeleton('w-24')}
                        </SidebarMenuItem>
                      ))
                    : adminItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isPathActive(item.path);

                        return (
                          <SidebarMenuItem key={item.key}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => handleNavClick(item.path)}
                              tooltip={item.label}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          <SidebarGroup>
            <div className="flex items-center justify-between">
              <SidebarGroupLabel>Meus Agentes</SidebarGroupLabel>
              {isLoading && (
                <div className="h-2 w-2 rounded-full bg-sidebar-foreground/25 animate-pulse" />
              )}
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <SidebarMenuItem key={`loading-agents-${index}`}>
                      {renderStaticSkeleton('w-28')}
                    </SidebarMenuItem>
                  ))
                ) : allAgents.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-sidebar-foreground/60">Nenhum agente disponivel.</p>
                ) : (
                  allAgents.map((agent) => {
                    const isActive =
                      currentPath === `/agents/${agent.id}` ||
                      (agent.workflowId ? currentPath === `/agents/${agent.workflowId}` : false);
                    const isLocked = Boolean(agent.isBlocked);
                    const isDisabled = isLocked && normalizedRole !== 'admin';

                    return (
                      <SidebarMenuItem key={agent.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleAgentClick(agent)}
                          tooltip={agent.name}
                          className={cn(isDisabled ? 'cursor-not-allowed opacity-50' : '')}
                        >
                          {isLocked ? (
                            <Lock className={cn('h-4 w-4 shrink-0', isActive ? 'text-red-400' : 'text-red-500/80')} />
                          ) : (
                            <Bot className="h-4 w-4 shrink-0" />
                          )}
                          <span className={cn(isDisabled ? 'italic' : '')}>{agent.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="pt-3">
          {isLoading && !currentUser ? (
            <SidebarMenu>
              <SidebarMenuItem>
                {renderStaticSkeleton('w-20')}
              </SidebarMenuItem>
            </SidebarMenu>
          ) : (
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      tooltip={displayName}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
                        {currentUser?.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="leading-none">{displayInitials}</span>
                        )}
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{displayName}</span>
                        <span className="truncate text-[10px] text-sidebar-foreground/70">{currentUser?.email}</span>
                      </div>
                      <MoreVertical className="ml-auto h-4 w-4 text-sidebar-foreground/70" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side={isMobile ? 'bottom' : 'right'}
                    align={isMobile ? 'end' : 'start'}
                    sideOffset={4}
                    alignOffset={0}
                    className="min-w-56 data-[side=right]:-translate-y-1.5 data-[side=left]:-translate-y-3"
                  >
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
                          {currentUser?.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="leading-none">{displayInitials}</span>
                          )}
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-medium">{displayName}</span>
                          <span className="truncate text-[10px] text-sidebar-foreground/70">{currentUser?.email}</span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavClick('/profile')}>Account</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)}>Log out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          )}

        </SidebarFooter>

      </SidebarRoot>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Encerrar Sessao?"
        message="Voce tem certeza que deseja sair da plataforma?"
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        confirmLabel="Sair"
        isDestructive
      />
    </>
  );
};
