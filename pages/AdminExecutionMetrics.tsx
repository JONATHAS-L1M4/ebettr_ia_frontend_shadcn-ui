import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Search,
  X,
} from '../components/ui/Icons';
import { KPICards } from '../components/dashboard/KPICards';
import DarkPage from '../components/layout/DarkPage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { useAppData } from '../hooks/useAppData';
import { useNotification } from '../context/NotificationContext';
import { Agent } from '../types';
import { ExecutionMetric, fetchExecutionMetrics } from '../services/n8n/workflowService';

type SortKey = 'agent' | 'success_rate' | 'average_duration';

const selectBaseClass =
  'appearance-none rounded-md border border-border bg-card px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const inputBaseClass =
  'block w-full sm:w-72 pl-9 pr-8 py-2.5 border border-input rounded-lg text-xs bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm';

const controlButtonClass =
  'px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-md bg-card shadow-sm border border-border hover:bg-accent';

const iconButtonClass =
  'p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-all inline-flex items-center justify-center';

const getDurationLabel = (duration: number | null) => {
  if (duration === null) return '-';
  return duration < 1 ? `${Math.round(duration * 1000)}ms` : `${duration.toFixed(2)}s`;
};

const getSuccessBarClass = (successRate: number) => {
  if (successRate >= 90) return 'bg-emerald-500';
  if (successRate >= 70) return 'bg-amber-500';
  return 'bg-red-500';
};

export const AdminExecutionMetrics: React.FC = () => {
  const { addNotification } = useNotification();
  const { agents, isLoading: isLoadingAgents } = useAppData();

  const [metrics, setMetrics] = useState<ExecutionMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'success_rate',
    direction: 'desc',
  });

  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);

      try {
        const data = await fetchExecutionMetrics();
        setMetrics(data);
      } catch (error) {
        addNotification('error', 'Erro', 'Falha ao carregar metricas de execucao.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadMetrics();
  }, [addNotification]);

  const agentByWorkflowId = useMemo(() => {
    const nextMap = new Map<string, Agent>();

    agents.forEach((agent) => {
      if (agent.workflowId) {
        nextMap.set(agent.workflowId, agent);
      }

      const configWorkflowId = agent.configSections
        .flatMap((section) => section.fields)
        .find((field) => field.id === 'n8n_workflow_id')?.value;

      if (typeof configWorkflowId === 'string' && configWorkflowId) {
        nextMap.set(configWorkflowId, agent);
      }
    });

    return nextMap;
  }, [agents]);

  const getAgentByWorkflowId = (workflowId: string) => agentByWorkflowId.get(workflowId);

  const filteredMetrics = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const result = normalizedQuery
      ? metrics.filter((metric) => {
          const agent = getAgentByWorkflowId(metric.workflowId);
          const agentName = agent?.name.toLowerCase() ?? '';

          return (
            metric.workflowId.toLowerCase().includes(normalizedQuery) ||
            agentName.includes(normalizedQuery)
          );
        })
      : metrics;

    return [...result].sort((a, b) => {
      if (sortConfig.key === 'agent') {
        const agentA = getAgentByWorkflowId(a.workflowId)?.name || 'Agente Desconhecido';
        const agentB = getAgentByWorkflowId(b.workflowId)?.name || 'Agente Desconhecido';

        return sortConfig.direction === 'asc'
          ? agentA.localeCompare(agentB)
          : agentB.localeCompare(agentA);
      }

      if (sortConfig.key === 'success_rate') {
        return sortConfig.direction === 'asc'
          ? a.success_rate - b.success_rate
          : b.success_rate - a.success_rate;
      }

      const durationA = a.average_duration || 0;
      const durationB = b.average_duration || 0;

      return sortConfig.direction === 'asc' ? durationA - durationB : durationB - durationA;
    });
  }, [metrics, searchQuery, sortConfig, agentByWorkflowId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, sortConfig]);

  const totalPages = Math.ceil(filteredMetrics.length / itemsPerPage);

  const paginatedMetrics = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMetrics.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredMetrics, itemsPerPage]);

  useEffect(() => {
    const lastPage = Math.max(1, totalPages || 1);

    if (currentPage > lastPage) {
      setCurrentPage(lastPage);
    }
  }, [currentPage, totalPages]);

  const handleSort = (key: SortKey) => {
    setSortConfig((previous) => ({
      key,
      direction: previous.key === key && previous.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const kpiStats = useMemo(() => {
    if (filteredMetrics.length === 0) {
      return { total: 0, successRate: 0, avgDuration: '-' };
    }

    const totalSuccessRate = filteredMetrics.reduce((accumulator, metric) => {
      return accumulator + metric.success_rate;
    }, 0);

    const metricsWithDuration = filteredMetrics.filter(
      (metric) => metric.average_duration !== null,
    );

    let avgDuration = '-';

    if (metricsWithDuration.length > 0) {
      const totalDuration = metricsWithDuration.reduce((accumulator, metric) => {
        return accumulator + (metric.average_duration || 0);
      }, 0);

      avgDuration = getDurationLabel(totalDuration / metricsWithDuration.length);
    }

    return {
      total: filteredMetrics.length,
      successRate: Number((totalSuccessRate / filteredMetrics.length).toFixed(1)),
      avgDuration,
    };
  }, [filteredMetrics]);

  const currentRangeStart = filteredMetrics.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const currentRangeEnd = Math.min(filteredMetrics.length, currentPage * itemsPerPage);
  const safeTotalPages = Math.max(totalPages, 1);

  if (isLoading || isLoadingAgents) {
    return (
      <DarkPage className="min-h-[calc(100vh-4rem)]">
        <div className="flex h-[60vh] flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DarkPage>
    );
  }

  return (
    <DarkPage className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto flex max-w-6xl animate-fade-in flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-foreground shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Metricas de Execucao
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Visao global de performance dos workflows.
                </p>
              </div>
            </div>
          </div>
        </div>

        <KPICards successRate={kpiStats.successRate} avgDuration={kpiStats.avgDuration} />

        <div className="overflow-hidden rounded-lg border border-border bg-panel shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-base font-bold text-foreground">Workflows monitorados</h3>
                <p className="hidden text-xs font-light text-muted-foreground sm:block">
                  Monitoramento agregado por agente e workflow.
                </p>
                <p className="mt-0.5 text-[10px] font-light text-muted-foreground sm:hidden">
                  Analise de taxa de sucesso e duracao.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:items-end">
                <div className="relative w-full sm:w-72">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por agente ou workflow ID..."
                  className={inputBaseClass}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full border-collapse text-left">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <TableHead className="px-5 py-3 transition-colors hover:bg-accent">
                    <button
                      type="button"
                      onClick={() => handleSort('agent')}
                      className="flex items-center gap-1 text-left"
                    >
                      Agente / Workflow
                      <SortIcon column="agent" />
                    </button>
                  </TableHead>
                  <TableHead className="px-5 py-3 text-center transition-colors hover:bg-accent">
                    <button
                      type="button"
                      onClick={() => handleSort('success_rate')}
                      className="mx-auto flex items-center justify-center gap-1"
                    >
                      Taxa de sucesso
                      <SortIcon column="success_rate" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden px-5 py-3 text-right transition-colors hover:bg-accent sm:table-cell">
                    <button
                      type="button"
                      onClick={() => handleSort('average_duration')}
                      className="ml-auto flex items-center justify-end gap-1"
                    >
                      Duracao media
                      <SortIcon column="average_duration" />
                    </button>
                  </TableHead>
                  <TableHead className="px-5 py-3 text-center">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border text-sm">
                {paginatedMetrics.length > 0 ? (
                  paginatedMetrics.map((metric) => {
                    const agent = getAgentByWorkflowId(metric.workflowId);
                    const agentName = agent?.name || 'Agente Desconhecido';
                    const targetAgentId = agent?.id || metric.workflowId;
                    const successRateWidth = Math.max(0, Math.min(metric.success_rate, 100));

                    return (
                      <TableRow
                        key={metric.workflowId}
                        className="group transition-colors hover:bg-accent/40"
                      >
                        <TableCell className="px-5 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                              {agent ? (
                                <Bot className="h-3.5 w-3.5" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div
                                className="max-w-[200px] truncate sm:max-w-[300px]"
                                title={agentName}
                              >
                                {agentName}
                              </div>
                              <div
                                className="mt-0.5 max-w-[200px] truncate font-mono text-[11px] text-muted-foreground sm:max-w-[300px]"
                                title={metric.workflowId}
                              >
                                {metric.workflowId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted sm:w-24">
                              <div
                                className={`h-full rounded-full ${getSuccessBarClass(metric.success_rate)}`}
                                style={{ width: `${successRateWidth}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-[11px] font-semibold text-foreground">
                              {metric.success_rate.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap px-5 py-3 text-right font-mono text-[11px] text-muted-foreground sm:table-cell">
                          <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-foreground">
                            {getDurationLabel(metric.average_duration)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              window.open(`/agents/${targetAgentId}`, '_blank', 'noopener,noreferrer')
                            }
                            className={iconButtonClass}
                            title="Ver agente"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-12 text-center italic text-muted-foreground">
                      {searchQuery
                        ? `Nenhuma metrica encontrada para "${searchQuery}"`
                        : 'Nenhuma metrica encontrada.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t border-border bg-muted/20 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-light text-muted-foreground">
                  Mostrando {currentRangeStart} - {currentRangeEnd} de {filteredMetrics.length}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pagina {currentPage} de {safeTotalPages}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                <select
                  value={itemsPerPage}
                  onChange={(event) => setItemsPerPage(Number(event.target.value))}
                  className={selectBaseClass}
                >
                  <option value={5}>5 / pag</option>
                  <option value={10}>10 / pag</option>
                  <option value={20}>20 / pag</option>
                  <option value={50}>50 / pag</option>
                  <option value={100}>100 / pag</option>
                </select>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={controlButtonClass}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={controlButtonClass}
                >
                  Proximo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DarkPage>
  );
};
