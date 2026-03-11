import React from 'react';
import { ExecutionLog, SortConfig } from './types';
import { XCircle, AlertOctagon, Eye, Loader2, Clock, ChevronUp, ChevronDown, Check } from '../ui/Icons';
import { formatDate, getDuration } from './utils';

interface LogsTableProps {
  logs: ExecutionLog[];
  isLoadingMore: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onViewDetails: (log: ExecutionLog) => void;
  workflowId?: string;
  hasMore?: boolean;
  canGoBack?: boolean;
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
}

export const LogsTable: React.FC<LogsTableProps> = ({
  logs,
  isLoadingMore,
  onNextPage,
  onPrevPage,
  onViewDetails,
  workflowId,
  hasMore = false,
  canGoBack = false,
  sortConfig,
  onSort,
}) => {
  const renderSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-3 h-3 ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 ml-1" />
    );
  };

  return (
    <div className="bg-panel border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Log de Execucoes</h3>
          <p className="text-xs text-muted-foreground font-light hidden sm:block">
            Historico detalhado do workflow <code className="text-foreground/80">{workflowId}</code>
          </p>
          <p className="text-[10px] text-muted-foreground font-light sm:hidden mt-0.5">
            {logs.length} execucoes exibidas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2">
              <Loader2 className="w-3 h-3 animate-spin" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={isLoadingMore || !canGoBack}
              className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-md bg-card shadow-sm border border-border hover:bg-accent"
            >
              Voltar
            </button>
            <button
              onClick={onNextPage}
              disabled={isLoadingMore || !hasMore}
              className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-md bg-card shadow-sm border border-border hover:bg-accent"
            >
              Proximo
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <th
                className="px-5 py-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onSort?.('status')}
              >
                <div className="flex items-center">
                  Status {renderSortIcon('status')}
                </div>
              </th>
              <th
                className="px-5 py-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onSort?.('id')}
              >
                <div className="flex items-center">
                  ID {renderSortIcon('id')}
                </div>
              </th>
              <th
                className="px-5 py-3 hidden md:table-cell cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onSort?.('mode')}
              >
                <div className="flex items-center">
                  Modo {renderSortIcon('mode')}
                </div>
              </th>
              <th
                className="px-5 py-3 hidden sm:table-cell cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onSort?.('startedAt')}
              >
                <div className="flex items-center">
                  Inicio {renderSortIcon('startedAt')}
                </div>
              </th>
              <th
                className="px-5 py-3 hidden lg:table-cell cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onSort?.('duration')}
              >
                <div className="flex items-center">
                  Duracao {renderSortIcon('duration')}
                </div>
              </th>
              <th className="px-5 py-3 text-center">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {isLoadingMore ? (
              [...Array(10)].map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-3 bg-muted rounded w-16" /></td>
                  <td className="px-5 py-4"><div className="h-3 bg-muted rounded w-12" /></td>
                  <td className="px-5 py-4 hidden md:table-cell"><div className="h-3 bg-muted/70 rounded w-14" /></td>
                  <td className="px-5 py-4 hidden sm:table-cell"><div className="h-3 bg-muted/70 rounded w-24" /></td>
                  <td className="px-5 py-4 hidden lg:table-cell"><div className="h-3 bg-muted/70 rounded w-16" /></td>
                  <td className="px-5 py-4 text-center"><div className="h-6 w-6 bg-muted rounded mx-auto" /></td>
                </tr>
              ))
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-accent/40 transition-colors group">
                  <td className="px-5 py-3 whitespace-nowrap">
                    {log.status === 'success' && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-foreground" />
                        <span className="text-xs font-semibold text-foreground">Sucesso</span>
                      </div>
                    )}
                    {log.status === 'error' && (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-xs font-semibold text-destructive">Erro</span>
                      </div>
                    )}
                    {log.status === 'canceled' && (
                      <div className="flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Cancelado</span>
                      </div>
                    )}
                    {(log.status === 'waiting' || log.status === 'running') && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                        <span className="text-xs font-medium text-muted-foreground">Rodando</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                    <span className="bg-muted/40 px-1.5 py-0.5 rounded text-foreground border border-border">
                      #{log.id}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground hidden md:table-cell">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{log.mode}</span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground font-mono text-[11px] hidden sm:table-cell">
                    {formatDate(log.startedAt)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {getDuration(log.startedAt, log.stoppedAt)}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => onViewDetails(log)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-all inline-flex items-center justify-center group/btn"
                      title="Ver Detalhes JSON"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
