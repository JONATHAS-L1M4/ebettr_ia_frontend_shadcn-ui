
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Agent } from '../types';
import { KPICards } from './dashboard/KPICards';
import { DurationChart } from './dashboard/DurationChart';
import { StatusChart } from './dashboard/StatusChart';
import { LogsTable } from './dashboard/LogsTable';
import { LogDetailsModal } from './dashboard/LogDetailsModal';
import { FilterBar } from './dashboard/FilterBar';
import { ExecutionLog, DashboardFiltersState, SortConfig } from './dashboard/types';
import { exportLogsToCSV } from './dashboard/utils';
import { useNotification } from '../context/NotificationContext';
import { fetchN8nExecutions } from '../services/n8nService';
import { RefreshCw } from './ui/Icons';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

interface ExecutionsDashboardProps {
  agent: Agent;
}

// Skeleton Component para o Dashboard
const DashboardSkeleton = () => (
    <div className="flex flex-col gap-4 sm:gap-8">
        {/* KPIs Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-panel border border-border rounded-xl p-6 h-[120px] flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-6 w-6" />
                    </div>
                    <div>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            ))}
        </div>

        {/* Filter Bar Skeleton */}
        <div className="bg-card p-4 rounded-lg border border-border h-[74px] flex flex-col md:flex-row items-center gap-4">
             <div className="flex gap-2 w-full md:w-auto flex-1">
                <Skeleton className="h-9 w-full md:w-60" />
                <Skeleton className="h-9 flex-1 hidden md:block" />
                <Skeleton className="h-9 flex-1 hidden md:block" />
             </div>
             <div className="flex gap-2 w-full md:w-auto">
                <Skeleton className="h-9 w-full md:w-32" />
             </div>
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 bg-panel border border-border rounded-lg p-5 h-[300px] flex flex-col">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20 mb-6" />
                <div className="flex-1 bg-muted/40 rounded-lg flex items-end justify-between px-4 pb-0 gap-2 overflow-hidden">
                    {[...Array(15)].map((_, i) => (
                        <Skeleton key={i} className="rounded-t w-full rounded-b-none" style={{ height: `${Math.random() * 60 + 20}%` }} />
                    ))}
                </div>
            </div>
            <div className="lg:col-span-1 bg-panel border border-border rounded-lg p-5 h-[300px] flex flex-col">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24 mb-6" />
                <div className="flex-1 flex items-center justify-center">
                    <Skeleton className="w-40 h-40 rounded-full border-[12px] border-muted/70 bg-transparent" />
                </div>
            </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-panel border border-border rounded-lg overflow-hidden min-h-[400px]">
            <div className="p-5 border-b border-border">
                <Skeleton className="h-5 w-40 mb-1" />
                <Skeleton className="h-3 w-60" />
            </div>
            <div className="divide-y divide-border">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full md:w-1/4">
                            <Skeleton className="w-2 h-2 rounded-full" />
                            <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="h-3 w-1/4 hidden md:block" />
                        <Skeleton className="h-3 w-1/4 hidden sm:block" />
                        <Skeleton className="w-8 h-8 rounded-md ml-auto" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const ExecutionsDashboard: React.FC<ExecutionsDashboardProps> = ({ agent }) => {
  const { addNotification } = useNotification();

  // Helper para extrair Workflow ID
  const getWorkflowId = useCallback((): string | null => {
    for (const section of agent.configSections) {
        for (const field of section.fields) {
            if (field.id === 'n8n_workflow_id' && field.value) {
                return String(field.value);
            }
        }
    }
    return null;
  }, [agent.configSections]);

  const currentWorkflowId = getWorkflowId();

  // Estado de Dados - Sempre inicializa vazio (Cache Removido)
  const [allLogs, setAllLogs] = useState<ExecutionLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);

  // Estado de Filtros
  const [filters, setFilters] = useState<DashboardFiltersState>({
      search: '',
      status: 'all',
      mode: 'all',
      dateRange: '14d'
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
      key: 'startedAt',
      direction: 'desc'
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);

  // Carregamento de dados com delay artificial para efeito visual
  const loadData = useCallback(async (silent = false, cursor: string | null = null) => {
      if (!currentWorkflowId) {
          setAllLogs([]);
          setNextCursor(null);
          setCurrentCursor(null);
          setCursorHistory([]);
          setLoading(false);
          return;
      }

      if (!silent) setLoading(true);
      setIsSyncing(true);
      
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 600));

      try {
          const fetchPromise = fetchN8nExecutions(currentWorkflowId, cursor);
          
          // Aguarda o fetch E o tempo mínimo se não for silencioso
          const [result] = await Promise.all([
              fetchPromise,
              !silent ? minLoadTime : Promise.resolve()
          ]);

          const { data, nextCursor: newCursor } = result;

          const sortedData = data.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
          setAllLogs(sortedData);
          setNextCursor(newCursor);
          setCurrentCursor(cursor);
      } catch (error) {
          if (!silent) addNotification('error', 'Erro de Conexão', 'Falha ao sincronizar histórico com o n8n.');
      } finally {
          setLoading(false);
          setIsSyncing(false);
      }
  }, [currentWorkflowId, addNotification]);

  // Load Inicial (e sempre que o agente mudar)
  useEffect(() => {
      setCursorHistory([]);
      loadData(false, null);
  }, [agent.id, currentWorkflowId, loadData]);

  // Auto-Refresh a cada 30 segundos (apenas na primeira página)
  useEffect(() => {
      if (!currentWorkflowId || currentCursor !== null) return;

      const intervalId = setInterval(() => {
          loadData(true, null);
      }, 30000);

      return () => clearInterval(intervalId);
  }, [currentWorkflowId, loadData, currentCursor]);

  // --- LÓGICA DE FILTRAGEM E ORDENAÇÃO ---
  const filteredLogs = useMemo(() => {
    let result = allLogs.filter(log => {
        if (filters.search && !log.id.includes(filters.search)) return false;
        if (filters.status !== 'all' && log.status !== filters.status) return false;
        if (filters.mode !== 'all' && log.mode !== filters.mode) return false;

        return true;
    });

    // Aplica Ordenação
    result = [...result].sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === 'duration') {
            const startA = new Date(a.startedAt).getTime();
            const endA = a.stoppedAt ? new Date(a.stoppedAt).getTime() : startA;
            valA = endA - startA;

            const startB = new Date(b.startedAt).getTime();
            const endB = b.stoppedAt ? new Date(b.stoppedAt).getTime() : startB;
            valB = endB - startB;
        } else {
            valA = a[sortConfig.key];
            valB = b[sortConfig.key];
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return result;
  }, [allLogs, filters, sortConfig]);

  // --- LÓGICA DE CÁLCULO DE KPIs ---
  const kpiStats = useMemo(() => {
      const total = filteredLogs.length;
      if (total === 0) return { total: 0, successRate: 0, avgDuration: '-' };

      const successCount = filteredLogs.filter(l => l.status === 'success').length;
      const successRate = (successCount / total) * 100;

      const finishedLogs = filteredLogs.filter(l => l.stoppedAt && l.startedAt);
      
      let avgMs = 0;
      if (finishedLogs.length > 0) {
          const totalMs = finishedLogs.reduce((acc, log) => {
              const start = new Date(log.startedAt).getTime();
              const end = new Date(log.stoppedAt!).getTime();
              const duration = end - start;
              return acc + (duration > 0 ? duration : 0);
          }, 0);
          avgMs = totalMs / finishedLogs.length;
      }

      let durationStr = '-';
      if (avgMs > 0) {
          if (avgMs < 1000) durationStr = `${Math.round(avgMs)}ms`;
          else durationStr = `${(avgMs / 1000).toFixed(2)}s`;
      }

      return {
          total,
          successRate: Number(successRate.toFixed(1)),
          avgDuration: durationStr
      };
  }, [filteredLogs]);

  // --- OPÇÕES DINÂMICAS PARA FILTROS ---
  const availableOptions = useMemo(() => {
      const statuses = new Set<string>();
      const modes = new Set<string>();

      allLogs.forEach(log => {
          if (log.status) statuses.add(log.status);
          if (log.mode) modes.add(log.mode);
      });

      return {
          statuses: Array.from(statuses),
          modes: Array.from(modes)
      };
  }, [allLogs]);

  const handleRefresh = () => {
    loadData(true, currentCursor);
    addNotification('info', 'Atualizando', 'Buscando novos logs...');
  };

  const handleNextPage = async () => {
    // Se já temos os dados carregados para a próxima página local
    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        setCurrentPage(prev => prev + 1);
        return;
    }

    // Se não temos, buscamos no n8n
    if (!nextCursor) return;
    setIsLoadingMore(true);
    setCursorHistory(prev => [...prev, currentCursor]);
    await loadData(true, nextCursor);
    setCurrentPage(1);
    setIsLoadingMore(false);
  };

  const handlePrevPage = async () => {
    if (currentPage > 1) {
        setCurrentPage(prev => prev - 1);
        return;
    }

    if (cursorHistory.length === 0) return;
    setIsLoadingMore(true);
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory(prev => prev.slice(0, -1));
    await loadData(true, prevCursor);
    setCurrentPage(1);
    setIsLoadingMore(false);
  };

  // Logs paginados para a tabela
  const paginatedLogs = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
        if (prev.key === key) {
            return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'desc' };
    });
    setCurrentPage(1);
  };

  const handleExport = () => {
    const filename = `execucoes_${agent.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    exportLogsToCSV(filteredLogs, filename);
    addNotification('success', 'Exportação iniciada', 'O arquivo CSV está sendo baixado.');
  };

  if (!currentWorkflowId) {
      return (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-card border border-dashed border-border rounded-lg m-4">
              <span className="text-sm font-semibold">Workflow não configurado</span>
              <p className="text-xs mt-1">Configure o ID do Workflow nas configurações do agente para ver as execuções.</p>
          </div>
      );
  }

  // --- VIEW RENDER ---
  
  if (loading) {
      return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-8 animate-fade-in relative pb-12">
        <div className="mb-4 flex items-end justify-between">
            <div>
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-rose-400 rounded-full"></div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">Execuções & Logs</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1 pl-4">Acompanhe o histórico de atividades e performance do agente.</p>
            </div>

            <Button
                onClick={handleRefresh}
                disabled={isSyncing}
                variant="outline"
                size="sm"
                className="h-10 rounded-lg px-4"
                title="Sincronizar com n8n"
            >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar
            </Button>
        </div>

        {/* Sync Indicator sutil fixo no topo */}
        {isSyncing && allLogs.length > 0 && (
            <div className="absolute top-20 right-0 flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest animate-fade-in">
                <RefreshCw className="w-3 h-3 animate-spin" /> Atualizando Dados
            </div>
        )}

        <KPICards 
            successRate={kpiStats.successRate}
            avgDuration={kpiStats.avgDuration}
        />

        <FilterBar 
            filters={filters} 
            onFilterChange={setFilters} 
            onRefresh={handleRefresh}
            onExport={handleExport}
            totalResults={filteredLogs.length}
            availableStatuses={availableOptions.statuses}
            availableModes={availableOptions.modes}
            hideDateRange={true}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
                <DurationChart logs={paginatedLogs} />
            </div>
            <div className="lg:col-span-1">
                <StatusChart logs={paginatedLogs} />
            </div>
        </div>

        <LogsTable 
            logs={paginatedLogs} 
            isLoadingMore={isLoadingMore} 
            onNextPage={handleNextPage} 
            onPrevPage={handlePrevPage}
            onViewDetails={setSelectedLog}
            workflowId={currentWorkflowId}
            hasMore={!!nextCursor || (currentPage < Math.ceil(filteredLogs.length / ITEMS_PER_PAGE))}
            canGoBack={currentPage > 1 || cursorHistory.length > 0}
            sortConfig={sortConfig}
            onSort={handleSort}
        />

        {selectedLog && (
            <LogDetailsModal 
                selectedLog={selectedLog} 
                onClose={() => setSelectedLog(null)} 
            />
        )}
    </div>
  );
};
