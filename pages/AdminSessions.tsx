
import React, { useState, useEffect, useMemo } from 'react';
import { UserSession } from '../types';
import { SessionVolumeChart } from '../components/dashboard/SessionVolumeChart';
import { FilterBar } from '../components/dashboard/FilterBar';
import { SessionsTable } from '../components/sessions/SessionsTable';
import { useNotification } from '../context/NotificationContext';
import { fetchSessions, revokeSession, revokeSessionsBulk, unblockUserSessions } from '../services/sessionService';
import { ChartDataPoint, DashboardFiltersState } from '../components/dashboard/types';
import { ShieldCheck, AlertOctagon, Users, Globe, Clock, LogOut, Loader2, X, Zap, RefreshCw } from '../components/ui/Icons';
import { ConfirmationModal } from '../components/shared/ConfirmationModal';
import DarkPage from '../components/layout/DarkPage';

interface AdminSessionsProps {
    onLogout?: () => void;
}

const AdminSessionsSkeleton = () => (
    <div className="flex flex-col gap-6 animate-pulse pb-12 max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-lg"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-3 bg-muted rounded w-48"></div>
                </div>
            </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-panel border border-border rounded-xl p-6 h-32 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between">
                        <div className="h-3 bg-muted rounded-full w-24"></div>
                        <div className="w-5 h-5 bg-muted rounded-lg"></div>
                    </div>
                    <div>
                        <div className="h-8 bg-muted rounded-lg w-16 mb-2"></div>
                        <div className="h-2.5 bg-muted rounded-full w-32"></div>
                    </div>
                </div>
            ))}
        </div>

        {/* Filter Bar Skeleton */}
        <div className="bg-card p-4 rounded-xl border border-border h-16 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3 flex-1">
                <div className="h-9 bg-muted rounded-lg w-full max-w-xs"></div>
                <div className="h-9 bg-muted rounded-lg w-32 hidden sm:block"></div>
                <div className="h-9 bg-muted rounded-lg w-32 hidden md:block"></div>
            </div>
            <div className="flex items-center gap-2">
                <div className="h-9 bg-muted rounded-lg w-9"></div>
                <div className="h-9 bg-muted rounded-lg w-9"></div>
            </div>
        </div>

        {/* Chart Skeleton */}
        <div className="bg-panel border border-border rounded-xl p-6 h-[300px] shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="h-4 bg-muted rounded-full w-48"></div>
                <div className="h-4 bg-muted rounded-full w-24"></div>
            </div>
            <div className="flex-1 flex items-end gap-2 px-2">
                {[...Array(14)].map((_, i) => (
                    <div 
                        key={i} 
                        className="flex-1 bg-muted rounded-t-md" 
                        style={{ height: `${Math.random() * 60 + 20}%` }}
                    ></div>
                ))}
            </div>
            <div className="h-px bg-muted w-full mt-4"></div>
            <div className="flex justify-between mt-4">
                {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-2 bg-muted rounded-full w-10"></div>
                ))}
            </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
             <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-card">
                <div className="h-5 bg-muted rounded-full w-48"></div>
                <div className="h-4 bg-muted rounded-full w-32"></div>
             </div>
             <div className="h-10 bg-muted border-b border-border px-6 flex items-center gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className={`h-2.5 bg-muted rounded-full ${i === 1 ? 'w-8' : 'w-24'} hidden sm:block`}></div>
                ))}
             </div>
             <div className="divide-y divide-border">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="px-6 py-4 flex items-center gap-4 bg-card">
                        <div className="w-4 h-4 bg-muted rounded"></div>
                        <div className="w-8 h-8 bg-muted rounded-full shrink-0"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-muted rounded-full w-1/4"></div>
                            <div className="h-2 bg-muted rounded-full w-1/3"></div>
                        </div>
                        <div className="h-3 bg-muted rounded-full w-24 hidden md:block"></div>
                        <div className="h-3 bg-muted rounded-full w-24 hidden lg:block"></div>
                        <div className="w-16 h-6 bg-muted rounded-full"></div>
                    </div>
                ))}
             </div>
        </div>
    </div>
);

export const AdminSessions: React.FC<AdminSessionsProps> = ({ onLogout }) => {
  const { addNotification } = useNotification();
  
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [limit, setLimit] = useState(15); 

  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [filters, setFilters] = useState<DashboardFiltersState>({
      search: '',
      status: 'all',
      mode: 'all', 
      dateRange: '14d'
  });

  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
      isDestructive?: boolean;
      confirmLabel?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const handleError = (e: any) => {
      if (e.message === 'Sessão expirada' || e.message?.includes('401')) {
          addNotification('warning', 'Sessão Expirada', 'Você será redirecionado para o login.');
          if (onLogout) {
              setTimeout(onLogout, 1500);
          }
      } else {
          addNotification('error', 'Erro', e.message || 'Ocorreu um erro inesperado.');
      }
  };

  const isFetchingRef = React.useRef(false);
  const loadData = async (reset = false) => {
      if (isFetchingRef.current) {
          setLoading(false);
          setIsLoadingMore(false);
          return;
      }

      const pageToFetch = reset ? 1 : currentPage + 1;
      
      if (reset) {
          setLoading(true);
          setSelectedSessionIds([]); 
      } else {
          setIsLoadingMore(true);
      }

      isFetchingRef.current = true;
      try {
          const { sessions: newSessions, onlineTracking } = await fetchSessions(pageToFetch, limit);
          
          if (onlineTracking) {
             console.log('Online Tracking Info:', onlineTracking);
          }

          if (reset) {
              setSessions(newSessions);
              setCurrentPage(1);
          } else {
              setSessions(prev => [...prev, ...newSessions]);
              setCurrentPage(pageToFetch);
          }

          setHasMore(newSessions.length === limit);

      } catch (e: any) {
          handleError(e);
      } finally {
          setLoading(false);
          setIsLoadingMore(false);
          isFetchingRef.current = false;
      }
  };

  useEffect(() => {
      loadData(true);
  }, [limit]);

  const openModal = (title: string, message: string, onConfirm: () => void, isDestructive = false, confirmLabel = 'Confirmar') => {
      setModalConfig({ isOpen: true, title, message, onConfirm, isDestructive, confirmLabel });
  };

  const handleRevoke = (id: string) => {
      openModal(
          'Derrubar Sessão?',
          'O usuário será desconectado imediatamente e precisará fazer login novamente.',
          async () => {
              setRevokingId(id);
              try {
                await revokeSession(id);
                addNotification('success', 'Sessão Encerrada', 'O usuário foi desconectado.');
                setSessions(prev => prev.filter(s => s.id !== id));
                setSelectedSessionIds(prev => prev.filter(sid => sid !== id));
              } catch (e: any) {
                handleError(e);
              } finally {
                setRevokingId(null);
              }
          },
          true,
          'Derrubar'
      );
  };

  const handleBulkRevokeSelected = () => {
      const activeSelected = sessions.filter(s => selectedSessionIds.includes(s.id) && s.status === 'active');

      if (activeSelected.length === 0) {
          addNotification('info', 'Aviso', 'Nenhuma sessão ativa selecionada.');
          return;
      }

      openModal(
          'Encerrar Selecionadas?',
          `Deseja derrubar as ${activeSelected.length} sessões ativas selecionadas?`,
          async () => {
              setIsBulkProcessing(true);
              let successCount = 0;
              for (const s of activeSelected) {
                  try {
                      await revokeSession(s.id);
                      successCount++;
                  } catch (e) {}
              }
              if (successCount > 0) {
                  addNotification('success', 'Sucesso', `${successCount} sessões foram encerradas.`);
                  loadData(true);
              }
              setIsBulkProcessing(false);
          },
          true,
          'Derrubar'
      );
  };

  const handleRevokeAllFiltered = () => {
      // Usa os novos métodos de API para revogação em lote baseada nos filtros atuais
      const riskMap: Record<string, number> = { 'high_risk': 80, 'medium_risk': 50, 'low_risk': 0 };
      const minRisk = filters.mode !== 'all' ? riskMap[filters.mode as string] : undefined;

      openModal(
          'Derrubar por Filtro?',
          'Esta ação usará o método Bulk da API para encerrar TODAS as sessões que coincidem com os filtros atuais (exceto a sua).',
          async () => {
              setIsBulkProcessing(true);
              try {
                  const result = await revokeSessionsBulk({
                      status: 'active',
                      min_risk: minRisk,
                      include_current_session: false,
                      limit: 10000
                  });
                  addNotification('success', 'Limpeza Concluída', `${result.revoked_count} sessões foram derrubadas com sucesso.`);
                  loadData(true);
              } catch (e: any) {
                  handleError(e);
              } finally {
                  setIsBulkProcessing(false);
              }
          },
          true,
          'Executar Bulk Wipe'
      );
  };

  const handleUnblock = (email: string) => {
      openModal(
          'Desbloquear Acesso?',
          `Deseja restaurar o acesso para o usuário ${email}?`,
          async () => {
              try {
                await unblockUserSessions(email);
                addNotification('success', 'Usuário Desbloqueado', `Acesso restaurado para ${email}.`);
                loadData(true); 
              } catch (e: any) {
                handleError(e);
              }
          },
          false,
          'Desbloquear'
      );
  };

  const filteredSessions = useMemo(() => {
      const now = new Date();
      const daysMap = { '7d': 7, '14d': 14, '30d': 30 };
      const maxAge = daysMap[filters.dateRange] * 24 * 60 * 60 * 1000;

      return sessions.filter(s => {
          const loginTime = new Date(s.loginTime).getTime();
          if (now.getTime() - loginTime > maxAge) return false;
          if (filters.search) {
              const term = filters.search.toLowerCase();
              if (!s.email.toLowerCase().includes(term) && !s.ip.includes(term)) return false;
          }
          if (filters.status !== 'all' && s.status !== filters.status) return false;
          if (filters.mode !== 'all') {
              if (filters.mode === 'high_risk' && s.riskScore < 80) return false;
              if (filters.mode === 'medium_risk' && (s.riskScore < 50 || s.riskScore >= 80)) return false;
              if (filters.mode === 'low_risk' && s.riskScore >= 50) return false;
          }
          return true;
      });
  }, [sessions, filters]);

  const kpiStats = useMemo(() => {
      const active = sessions.filter(s => s.status === 'active').length;
      const online = sessions.filter(s => s.isOnline).length;
      const highRisk = sessions.filter(s => s.riskScore > 70).length;
      
      let totalDurationMs = 0;
      let count = 0;
      sessions.forEach(s => {
          const start = new Date(s.loginTime).getTime();
          const end = new Date(s.lastActive).getTime();
          const diff = end - start;
          if (diff > 0) {
              totalDurationMs += diff;
              count++;
          }
      });
      
      const avgMinutes = count > 0 ? Math.round((totalDurationMs / count) / 60000) : 0;
      return { active, online, highRisk, avgTime: `${avgMinutes} min` };
  }, [sessions]);

  const chartData = useMemo((): ChartDataPoint[] => {
      const daysMap = { '7d': 7, '14d': 14, '30d': 30 };
      const numDays = daysMap[filters.dateRange];
      const dataMap = new Map<string, { count: number, date: Date }>();
      const now = new Date();
      now.setHours(0, 0, 0, 0); 
      for (let i = 0; i < numDays; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          dataMap.set(key, { count: 0, date: d });
      }
      filteredSessions.forEach(s => {
          const d = new Date(s.loginTime);
          const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          if (dataMap.has(key)) {
              const entry = dataMap.get(key)!;
              entry.count += 1;
              dataMap.set(key, entry);
          }
      });
      const result: ChartDataPoint[] = [];
      dataMap.forEach((entry, day) => {
          result.push({ day, value: entry.count, height: '0%', dateObj: entry.date });
      });
      const sorted = result.reverse();
      const maxValue = Math.max(...sorted.map(d => d.value), 5);
      return sorted.map(d => ({ ...d, height: `${Math.max((d.value / maxValue) * 100, 4)}%` }));
  }, [filteredSessions, filters.dateRange]);

  if (loading) {
      return (
        <DarkPage className="min-h-[calc(100vh-4rem)]">
          <AdminSessionsSkeleton />
        </DarkPage>
      );
  }

  return (
    <DarkPage className="min-h-[calc(100vh-4rem)]">
    <div className="flex flex-col gap-6 animate-fade-in relative pb-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-border rounded-lg flex items-center justify-center text-foreground bg-muted">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-foreground tracking-tight">Sessões & Logins</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 font-light">Monitoramento de acessos e segurança em tempo real.</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-panel border border-border rounded-xl p-6 flex flex-col justify-between shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Online Agora</h3>
                        <button 
                            onClick={() => loadData(true)}
                        className="p-1 text-muted-foreground hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Atualizar"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <Globe className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                    <span className="text-3xl font-bold text-foreground tracking-tight block mb-1">{kpiStats.online}</span>
                    <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Usuários ativos
                    </div>
                </div>
            </div>
            <div className="bg-panel border border-border rounded-xl p-6 flex flex-col justify-between shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Risco Elevado</h3>
                        <button 
                            onClick={() => loadData(true)}
                        className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-950/40 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Atualizar"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <AlertOctagon className={`w-4 h-4 ${kpiStats.highRisk > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                    <span className="text-3xl font-bold text-foreground tracking-tight block mb-1">{kpiStats.highRisk}</span>
                    <div className="text-[10px] font-medium text-muted-foreground">Logins suspeitos (Últimos 14d)</div>
                </div>
            </div>
            <div className="bg-panel border border-border rounded-xl p-6 flex flex-col justify-between shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Tempo Médio</h3>
                        <button 
                            onClick={() => loadData(true)}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all opacity-0 group-hover:opacity-100"
                        title="Atualizar"
                    >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                    <span className="text-3xl font-bold text-foreground tracking-tight block mb-1">{kpiStats.avgTime}</span>
                    <div className="text-[10px] font-medium text-muted-foreground">Duração da sessão</div>
                </div>
            </div>
        </div>

        <FilterBar 
            filters={filters} 
            onFilterChange={setFilters} 
            onRefresh={() => loadData(true)}
            onExport={() => addNotification('info', 'Exportar', 'Funcionalidade em breve')}
            totalResults={filteredSessions.length}
            availableStatuses={['active', 'revoked', 'blocked']} 
            availableModes={['high_risk', 'medium_risk', 'low_risk']}
            limit={limit}
            onLimitChange={setLimit}
        />

        <div className="w-full">
            <SessionVolumeChart data={chartData} rangeLabel={filters.dateRange} />
        </div>

        {/* Bulk Action Bar - Standardized Flat System Style (Positioned Above Table) */}
        {selectedSessionIds.length > 0 && (
            <div className="animate-fade-in mx-1 -mb-4 z-10 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60">
                        <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">{selectedSessionIds.length} sessões selecionadas</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Ações em Massa Disponíveis</p>
                    </div>
                </div>
                
                <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <button 
                        onClick={() => setSelectedSessionIds([])}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-muted hover:text-foreground sm:flex-none"
                    >
                        <X className="w-4 h-4" /> Limpar Seleção
                    </button>
                    
                    <button 
                        onClick={handleRevokeAllFiltered}
                        disabled={isBulkProcessing}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-xs font-bold text-foreground transition-all hover:bg-muted sm:flex-none"
                        title="Derrubar todas as sessões que batem com o filtro atual usando API bulk"
                    >
                        <Zap className="w-4 h-4" /> Revogar Tudo (Filtro)
                    </button>

                    <button 
                        onClick={handleBulkRevokeSelected}
                        disabled={isBulkProcessing}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-muted/60 px-6 py-2 text-xs font-bold text-foreground transition-all hover:bg-muted sm:flex-none"
                    >
                        {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                        Derrubar Selecionadas
                    </button>
                </div>
            </div>
        )}

        <SessionsTable 
            sessions={filteredSessions} 
            onRevoke={handleRevoke}
            revokingId={revokingId}
            onBlock={() => {}} 
            onUnblock={handleUnblock}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => loadData(false)}
            selectedIds={selectedSessionIds}
            onSelectionChange={setSelectedSessionIds}
        />

        <ConfirmationModal 
            isOpen={modalConfig.isOpen}
            title={modalConfig.title}
            message={modalConfig.message}
            onConfirm={modalConfig.onConfirm}
            onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            isDestructive={modalConfig.isDestructive}
            confirmLabel={modalConfig.confirmLabel}
        />
    </div>
    </DarkPage>
  );
};
