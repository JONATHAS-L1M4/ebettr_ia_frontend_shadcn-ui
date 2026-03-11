
import React from 'react';
import { Search, Funnel, Download, ChevronDown } from '../ui/Icons';
import { DashboardFiltersState } from './types';

const selectBaseClass =
  'w-full px-3 py-2.5 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-xs placeholder:text-muted-foreground shadow-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer';

const searchInputClass =
  'block w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-xs text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

interface FilterBarProps {
  filters: DashboardFiltersState;
  onFilterChange: (newFilters: DashboardFiltersState) => void;
  onRefresh: () => void;
  onExport: () => void;
  totalResults: number;
  availableStatuses?: string[];
  availableModes?: string[];
  limit?: number;
  onLimitChange?: (limit: number) => void;
  hideDateRange?: boolean;
  searchPlaceholder?: string;
}

// Mapas de tradução para exibição amigável
const STATUS_LABELS: Record<string, string> = {
    // Execuções
    success: 'Sucesso',
    error: 'Erro',
    canceled: 'Cancelado',
    waiting: 'Aguardando',
    running: 'Rodando',
    new: 'Novo',
    // Sessões
    active: 'Ativa',
    revoked: 'Encerrada',
    blocked: 'Bloqueada'
};

const MODE_LABELS: Record<string, string> = {
    // Execuções
    webhook: 'Webhook',
    trigger: 'Gatilho (Trigger)',
    manual: 'Manual',
    test: 'Teste',
    error: 'Erro',
    integrated: 'Integrado',
    // Sessões (Risco)
    high_risk: 'Crítico',
    medium_risk: 'Médio',
    low_risk: 'Baixo'
};

export const FilterBar: React.FC<FilterBarProps> = ({ 
    filters, 
    onFilterChange, 
    onRefresh, 
    onExport, 
    totalResults,
    availableStatuses = [],
    availableModes = [],
    limit,
    onLimitChange,
    hideDateRange = false,
    searchPlaceholder = 'Buscar por ID...'
}) => {
  
  const handleChange = (key: keyof DashboardFiltersState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const selectClass = selectBaseClass;

  return (
    <div className="bg-card p-4 rounded-lg border border-border shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
      
      {/* Left Group: Search & Selects */}
      <div className="flex flex-col md:flex-row gap-2 flex-1">
        
        {/* Search - Largura ajustada para não empurrar os filtros */}
        <div className="relative group w-full md:w-72 shrink-0">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            className={searchInputClass}
            placeholder={searchPlaceholder}
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>

        {/* Filters Group with reduced gap (gap-2) to prevent overlap */}
        <div className="grid grid-cols-2 gap-2 w-full md:w-auto flex-1 md:flex-none">
            {/* Status Filter */}
            <div className="relative w-full">
                <div className="absolute left-2.5 top-2.5 pointer-events-none">
                    <Funnel className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                </div>
                <select 
                    value={filters.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className={`${selectClass} pl-8`}
                >
                    <option value="all">Todos Status</option>
                    {availableStatuses.map(status => (
                        <option key={status} value={status}>
                            {STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Mode Filter */}
            <div className="relative w-full">
                <select 
                    value={filters.mode}
                    onChange={(e) => handleChange('mode', e.target.value)}
                    className={`${selectClass}`}
                >
                    <option value="all">Todos Níveis</option>
                    {availableModes.map(mode => (
                        <option key={mode} value={mode}>
                            {MODE_LABELS[mode] || mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      {/* Right Group: Date Range & Actions */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 border-t xl:border-t-0 border-border pt-3 xl:pt-0">
         
         {/* Limit Selector (Optional) */}
         {onLimitChange && limit && (
             <div className="relative hidden md:block">
                <select
                    value={limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className={selectClass}
                    title="Itens por página"
                >
                    <option value={15}>15 / pág</option>
                    <option value={25}>25 / pág</option>
                    <option value={50}>50 / pág</option>
                    <option value={100}>100 / pág</option>
                </select>
                <div className="absolute right-2 top-2.5 pointer-events-none text-muted-foreground">
                    <ChevronDown className="w-3 h-3" />
                </div>
             </div>
         )}

         {/* Date Range Selector */}
         {!hideDateRange && (
             <div className="bg-muted p-1 rounded-lg flex items-center gap-1 shadow-inner w-full md:w-auto justify-center">
                <button 
                    onClick={() => handleChange('dateRange', '7d')}
                    className={`
                        flex-1 md:flex-none flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all duration-300 ease-out
                        ${filters.dateRange === '7d' 
                            ? 'bg-primary text-primary-foreground shadow-md transform scale-100' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-background'}
                    `}
                >
                    7d
                </button>
                <button 
                    onClick={() => handleChange('dateRange', '14d')}
                    className={`
                        flex-1 md:flex-none flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all duration-300 ease-out
                        ${filters.dateRange === '14d' 
                            ? 'bg-primary text-primary-foreground shadow-md transform scale-100' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-background'}
                    `}
                >
                    14d
                </button>
                <button 
                    onClick={() => handleChange('dateRange', '30d')}
                    className={`
                        flex-1 md:flex-none flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all duration-300 ease-out
                        ${filters.dateRange === '30d' 
                            ? 'bg-primary text-primary-foreground shadow-md transform scale-100' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-background'}
                    `}
                >
                    30d
                </button>
             </div>
         )}

         <div className="hidden md:block w-[1px] h-6 bg-border mx-1"></div>

         <div className="flex gap-2 w-full md:w-auto">
             <button 
                onClick={onExport}
                className="flex-1 md:flex-none flex items-center justify-center p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-border md:border-transparent"
                title="Exportar CSV"
             >
                <Download className="w-4 h-4" />
             </button>
         </div>
      </div>
    </div>
  );
};
