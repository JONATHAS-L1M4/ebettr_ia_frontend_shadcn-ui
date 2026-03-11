import React, { useMemo, useState } from 'react';
import { RagDocument, RagUsage } from '../../types';
import { AlertTriangle, Eye, FileText, Loader2, Search, Trash2, X } from '../ui/Icons';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '../ui/table';

const selectBaseClass =
 'h-7 appearance-none rounded-md border border-border bg-card px-2.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const inputBaseClass =
 'block w-full sm:w-72 pl-9 pr-8 py-2.5 border border-input rounded-lg text-xs bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm';

const controlButtonClass =
 'px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-md bg-card shadow-sm border border-border hover:bg-accent';

const dangerButtonClass =
 'flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-sm border bg-red-950/40 text-red-300 border-red-900/50 hover:bg-red-700 hover:text-red-50 hover:border-red-600';

interface RagDocumentsTableProps {
 documents: RagDocument[];
 isLoading: boolean;
 usage?: RagUsage | null;
 selectedIds: number[];
 onSelectionChange: (ids: number[]) => void;
 onDelete?: (id: number) => void;
 onView?: (doc: RagDocument) => void;
 onBulkDelete?: () => void;
 isDeletingBulk?: boolean;
}

export const RagDocumentsTable: React.FC<RagDocumentsTableProps> = ({
 documents,
 isLoading,
 usage = null,
 selectedIds,
 onSelectionChange,
 onDelete,
 onView,
 onBulkDelete,
 isDeletingBulk = false,
}) => {
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(10);
 const [searchTerm, setSearchTerm] = useState('');

 const filteredDocuments = useMemo(() => {
 if (!searchTerm.trim()) return documents;

 const term = searchTerm.toLowerCase();

 return documents.filter((doc) => {
 return (
 doc.file_name.toLowerCase().includes(term) ||
 doc.id.toString().includes(term) ||
 (doc.blobType && doc.blobType.toLowerCase().includes(term))
 );
 });
 }, [documents, searchTerm]);

 const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

 const paginatedDocuments = useMemo(() => {
 const startIndex = (currentPage - 1) * itemsPerPage;
 return filteredDocuments.slice(startIndex, startIndex + itemsPerPage);
 }, [currentPage, filteredDocuments, itemsPerPage]);

 React.useEffect(() => {
 setCurrentPage(1);
 }, [searchTerm]);

 React.useEffect(() => {
 const lastPage = Math.max(1, totalPages || 1);

 if (currentPage > lastPage) {
 setCurrentPage(lastPage);
 }
 }, [currentPage, totalPages]);

 const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
 if (event.target.checked) {
 const currentIds = paginatedDocuments.map((doc) => doc.id);
 const newSelectedIds = Array.from(new Set([...selectedIds, ...currentIds]));
 onSelectionChange(newSelectedIds);
 return;
 }

 const currentIds = paginatedDocuments.map((doc) => doc.id);
 onSelectionChange(selectedIds.filter((id) => !currentIds.includes(id)));
 };

 const handleSelectOne = (id: number) => {
 if (selectedIds.includes(id)) {
 onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
 return;
 }

 onSelectionChange([...selectedIds, id]);
 };

 const goToPage = (page: number) => {
 if (page >= 1 && page <= totalPages) {
 setCurrentPage(page);
 }
 };

 if (documents.length === 0 && !isLoading) {
 return (
 <div className="rounded-xl border border-dashed border-border bg-muted/40 p-12 text-center">
 <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
 <FileText className="h-8 w-8 text-muted-foreground" />
 </div>
 <h3 className="text-lg font-bold text-foreground">Nenhum documento encontrado</h3>
 <p className="mx-auto mt-2 max-w-md text-muted-foreground">
 Esta base de conhecimento ainda nao possui documentos.
 </p>
 </div>
 );
 }

 const allOnPageSelected =
 paginatedDocuments.length > 0 &&
 paginatedDocuments.every((doc) => selectedIds.includes(doc.id));
 const currentRangeStart = filteredDocuments.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
 const currentRangeEnd = Math.min(filteredDocuments.length, currentPage * itemsPerPage);
 const safeTotalPages = Math.max(totalPages, 1);

 const renderSkeletonRows = () => {
 return Array.from({ length: itemsPerPage }).map((_, index) => (
 <TableRow key={`skeleton-${index}`} className="animate-pulse">
 <TableCell className="px-5 py-4">
 <div className="h-4 w-4 rounded border border-border bg-muted" />
 </TableCell>
 <TableCell className="px-5 py-4">
 <div className="flex items-center gap-3">
 <div className="h-6 w-6 rounded bg-muted shrink-0" />
 <div className="h-3 w-48 rounded bg-muted sm:w-64" />
 </div>
 </TableCell>
 <TableCell className="hidden px-5 py-4 sm:table-cell">
 <div className="h-3 w-16 rounded bg-muted/70" />
 </TableCell>
 <TableCell className="hidden px-5 py-4 md:table-cell">
 <div className="h-4 w-12 rounded border border-border bg-muted" />
 </TableCell>
 <TableCell className="px-5 py-4 text-center">
 <div className="mx-auto h-6 w-6 rounded bg-muted" />
 </TableCell>
 </TableRow>
 ));
 };

 return (
 <div className="bg-panel border border-border rounded-lg shadow-sm overflow-hidden">
 <div className="p-5 border-b border-border flex flex-col gap-4">
 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
 <div>
 <h3 className="text-base font-bold text-foreground">Documentos</h3>
 <p className="text-xs text-muted-foreground font-light hidden sm:block">
 Base de conhecimento do agente.
 </p>
 <p className="text-[10px] text-muted-foreground font-light sm:hidden mt-0.5">
 Consulte os documentos disponiveis.
 </p>
 </div>

 <div className="flex flex-col gap-3 sm:items-end">
 <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
 {usage && (
 <div
 className={`flex min-w-[180px] flex-col justify-center rounded-lg border border-border bg-[#1f1f1f] px-4 py-2.5 shadow-sm ${
 isLoading ? 'opacity-60' : 'opacity-100'
 }`}
 >
 <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
 <div
 className={`h-full rounded-full transition-all duration-700 ease-out ${
 isLoading
 ? 'bg-muted-foreground'
 : usage.is_over_limit
 ? 'bg-red-500'
 : usage.usage_percent > 80
 ? 'bg-amber-500'
 : 'bg-primary'
 }`}
 style={{ width: `${Math.min(usage.usage_percent, 100)}%` }}
 />
 </div>
 <div className="mt-1 flex items-center justify-between">
 <span className="text-[8px] font-medium leading-none tracking-tight text-muted-foreground">
 {(usage.total_bytes / 1024 / 1024).toFixed(2)} / {usage.storage_limit_mb} MB
 </span>
 <div className="flex items-center gap-2">
 <span
 className={`text-[9px] font-bold leading-none tabular-nums ${
 usage.is_over_limit ? 'text-red-400' : 'text-foreground'
 }`}
 >
 {usage.usage_percent}%
 </span>
 {usage.is_over_limit && !isLoading && (
 <span className="flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider leading-none text-red-400 animate-pulse">
 <AlertTriangle className="w-2 h-2" /> Limite
 </span>
 )}
 </div>
 </div>
 </div>
 )}
 <div className="relative w-full sm:w-72">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <Search className="h-3.5 w-3.5 text-muted-foreground" />
 </div>
 <input
 type="text"
 value={searchTerm}
 onChange={(event) => setSearchTerm(event.target.value)}
 placeholder="Buscar por nome, tipo ou ID..."
 className={inputBaseClass}
 />
 {searchTerm && (
 <button
 type="button"
 onClick={() => setSearchTerm('')}
 className="absolute inset-y-0 right-0 pr-2 flex items-center text-muted-foreground hover:text-foreground"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="overflow-x-auto">
 <Table className="w-full text-left border-collapse">
 <TableHeader>
 <TableRow className="bg-muted/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
 <TableHead className="px-5 py-3 w-10">
 <input
 type="checkbox"
 className="h-4 w-4 cursor-pointer rounded border border-border bg-background"
 checked={allOnPageSelected}
 onChange={handleSelectAll}
 />
 </TableHead>
 <TableHead className="px-5 py-3">Nome do Arquivo</TableHead>
 <TableHead className="px-5 py-3 hidden sm:table-cell">Tipo</TableHead>
 <TableHead className="px-5 py-3 hidden md:table-cell">ID</TableHead>
 <TableHead className="px-5 py-3 text-center">Acoes</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-border text-sm">
 {isLoading ? (
 renderSkeletonRows()
 ) : paginatedDocuments.length > 0 ? (
 paginatedDocuments.map((doc) => (
 <TableRow
 key={doc.id}
 className={`hover:bg-accent/40 transition-colors group ${selectedIds.includes(doc.id) ? 'bg-accent/20' : ''}`}
 >
 <TableCell className="px-5 py-3 whitespace-nowrap">
 <input
 type="checkbox"
 className="h-4 w-4 cursor-pointer rounded border border-border bg-background"
 checked={selectedIds.includes(doc.id)}
 onChange={() => handleSelectOne(doc.id)}
 />
 </TableCell>
 <TableCell className="px-5 py-3 font-medium text-foreground">
 <div className="flex items-center gap-3">
 <div className="w-6 h-6 rounded bg-muted text-muted-foreground flex items-center justify-center shrink-0">
 <FileText className="w-3.5 h-3.5" />
 </div>
 <span className="truncate max-w-[200px] sm:max-w-[300px]" title={doc.file_name}>
 {doc.file_name}
 </span>
 </div>
 </TableCell>
 <TableCell className="px-5 py-3 whitespace-nowrap text-muted-foreground hidden sm:table-cell">
 <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
 {doc.blobType || '-'}
 </span>
 </TableCell>
 <TableCell className="px-5 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground hidden md:table-cell">
 <span className="bg-muted/40 px-1.5 py-0.5 rounded text-foreground border border-border">
 #{doc.id}
 </span>
 </TableCell>
 <TableCell className="px-5 py-3 whitespace-nowrap text-center">
 <button
 type="button"
 onClick={() => onView && onView(doc)}
 className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-all inline-flex items-center justify-center group/btn"
 title="Ver Detalhes"
 >
 <Eye className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={() => onDelete && onDelete(doc.id)}
 className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-950/40 rounded-md transition-all inline-flex items-center justify-center"
 title="Excluir"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={5} className="px-5 py-12 text-center text-muted-foreground italic">
 Nenhum documento encontrado para "{searchTerm}"
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
 Mostrando {currentRangeStart} - {currentRangeEnd} de {filteredDocuments.length}
 </p>
 <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Pagina {currentPage} de {safeTotalPages}
 </p>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
 <select
 value={itemsPerPage}
 onChange={(event) => {
 setItemsPerPage(Number(event.target.value));
 setCurrentPage(1);
 }}
 className={selectBaseClass}
 >
 <option value={5}>5 / pag</option>
 <option value={10}>10 / pag</option>
 <option value={20}>20 / pag</option>
 <option value={50}>50 / pag</option>
 <option value={100}>100 / pag</option>
 </select>
 {selectedIds.length > 0 && onBulkDelete && (
 <button
 type="button"
 onClick={onBulkDelete}
 disabled={isDeletingBulk}
 className={dangerButtonClass}
 >
 {isDeletingBulk ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
 Excluir ({selectedIds.length})
 </button>
 )}
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
 );
};
