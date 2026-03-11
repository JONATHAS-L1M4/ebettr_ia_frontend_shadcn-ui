import React, { useState, useMemo } from 'react';
import { RagDocument } from '../../types';
import { FileText, Trash2, Eye, Search, X, Loader2 } from '../ui/Icons';
import { selectBaseClass } from '../inputs/styles';

interface RagDocumentsTableProps {
  documents: RagDocument[];
  isLoading: boolean;
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
  selectedIds,
  onSelectionChange,
  onDelete, 
  onView,
  onBulkDelete,
  isDeletingBulk = false
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const term = searchTerm.toLowerCase();
    return documents.filter(doc => 
      doc.file_name.toLowerCase().includes(term) || 
      doc.id.toString().includes(term) ||
      (doc.blobType && doc.blobType.toLowerCase().includes(term))
    );
  }, [documents, searchTerm]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const currentIds = paginatedDocuments.map(doc => doc.id);
      const newSelectedIds = Array.from(new Set([...selectedIds, ...currentIds]));
      onSelectionChange(newSelectedIds);
    } else {
      const currentIds = paginatedDocuments.map(doc => doc.id);
      onSelectionChange(selectedIds.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };



  if (documents.length === 0 && !isLoading) {
    return (
        <div className="p-12 border border-dashed border-border rounded-xl bg-muted/40 text-center">
            <div className="w-16 h-16 bg-card rounded-2xl shadow-sm border border-border flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Nenhum documento encontrado</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Esta base de conhecimento ainda não possui documentos.
            </p>
        </div>
    );
  }

  const allOnPageSelected = paginatedDocuments.length > 0 && paginatedDocuments.every(doc => selectedIds.includes(doc.id));

  const renderSkeletonRows = () => {
    return Array.from({ length: itemsPerPage }).map((_, index) => (
      <tr key={`skeleton-${index}`} className="animate-pulse border-b border-border">
        <td className="px-5 py-3">
          <div className="w-4 h-4 bg-muted rounded border border-border"></div>
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-muted rounded shrink-0"></div>
            <div className="h-3 w-48 sm:w-64 bg-muted rounded"></div>
          </div>
        </td>
        <td className="px-5 py-3 hidden sm:table-cell">
          <div className="h-2.5 w-16 bg-muted rounded"></div>
        </td>
        <td className="px-5 py-3 hidden md:table-cell">
          <div className="h-4 w-12 bg-muted rounded border border-border"></div>
        </td>
        <td className="px-5 py-3">
          <div className="flex justify-center gap-1">
            <div className="w-7 h-7 bg-muted rounded-md"></div>
            <div className="w-7 h-7 bg-muted rounded-md"></div>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="bg-panel border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h3 className="text-base font-bold text-foreground">Documentos</h3>
            <p className="text-xs text-muted-foreground font-light hidden sm:block">
                Mostrando {filteredDocuments.length === 0 ? 0 : Math.min(filteredDocuments.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredDocuments.length, currentPage * itemsPerPage)} de {filteredDocuments.length}
            </p>
            <p className="text-[10px] text-muted-foreground font-light sm:hidden mt-0.5">{filteredDocuments.length} documentos encontrados</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {selectedIds.length > 0 && onBulkDelete && (
                <button
                    onClick={onBulkDelete}
                    disabled={isDeletingBulk}
                    className="flex h-10 w-full items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm border bg-red-950/40 text-red-300 border-red-900/50 hover:bg-red-700 hover:text-red-50 hover:border-red-600 disabled:opacity-50 sm:w-auto"
                >
                    {isDeletingBulk ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Excluir ({selectedIds.length})
                </button>
            )}

            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="block w-full pl-9 pr-8 py-2.5 border border-input rounded-lg text-xs bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={selectBaseClass}
                >
                  <option value={5}>5 / pág</option>
                  <option value={10}>10 / pág</option>
                  <option value={20}>20 / pág</option>
                  <option value={50}>50 / pág</option>
                  <option value={100}>100 / pág</option>
                </select>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-10 px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-lg bg-card shadow-sm border border-border"
                    >
                        Voltar
                    </button>
                    <button 
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="h-10 px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-lg bg-card shadow-sm border border-border"
                    >
                        Próximo
                    </button>
                </div>
            </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-border bg-background text-foreground focus:ring-ring cursor-pointer"
                  checked={allOnPageSelected}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-5 py-3">Nome do Arquivo</th>
              <th className="px-5 py-3 hidden sm:table-cell">Tipo</th>
              <th className="px-5 py-3 hidden md:table-cell">ID</th>
              <th className="px-5 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {isLoading ? renderSkeletonRows() : (
              paginatedDocuments.length > 0 ? paginatedDocuments.map((doc) => (
                <tr key={doc.id} className={`hover:bg-muted transition-colors group ${selectedIds.includes(doc.id) ? 'bg-muted/60' : ''}`}>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="rounded border-border bg-background text-foreground focus:ring-ring cursor-pointer"
                      checked={selectedIds.includes(doc.id)}
                      onChange={() => handleSelectOne(doc.id)}
                    />
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate max-w-[200px] sm:max-w-[300px]" title={doc.file_name}>
                          {doc.file_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground hidden sm:table-cell">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          {doc.blobType}
                      </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground hidden md:table-cell">
                      <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">
                          #{doc.id}
                      </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-center">
                    <button 
                        onClick={() => onView && onView(doc)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all inline-flex items-center justify-center mr-1"
                        title="Visualizar Conteúdo"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onDelete && onDelete(doc.id)}
                        className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-950/40 rounded-md transition-all inline-flex items-center justify-center"
                        title="Excluir"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground italic">
                    Nenhum documento encontrado para "{searchTerm}"
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
