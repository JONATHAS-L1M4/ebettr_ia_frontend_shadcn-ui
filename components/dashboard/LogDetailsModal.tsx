import React, { useState, useEffect } from 'react';
import { ExecutionLog } from './types';
import { Terminal, X, Copy, Loader2 } from '../ui/Icons';
import { useNotification } from '../../context/NotificationContext';
import { fetchN8nExecutionDetails } from '../../services/n8nService';

interface LogDetailsModalProps {
  selectedLog: ExecutionLog;
  onClose: () => void;
}

export const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ selectedLog, onClose }) => {
  const { addNotification } = useNotification();
  const [fullDetails, setFullDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadDetails = async () => {
      setLoading(true);
      try {
        const details = await fetchN8nExecutionDetails(selectedLog.workflowId, selectedLog.id);
        if (mounted) {
          setFullDetails(details);
        }
      } catch (error) {
        if (mounted) {
          addNotification('warning', 'Aviso', 'Nao foi possivel carregar os detalhes completos. Exibindo resumo.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDetails();
    return () => {
      mounted = false;
    };
  }, [selectedLog.id, selectedLog.workflowId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification('success', 'Copiado!', 'JSON copiado para a area de transferencia.');
  };

  const displayData = fullDetails || selectedLog;
  const displayText = JSON.stringify(displayData, null, 2);
  const currentLength = displayText.length;

  return (
    <div className="fixed inset-0 z-[9999] flex animate-fade-in items-center justify-center bg-background/68 p-4 backdrop-blur-[1.5px]">
      <div className="flex h-[80vh] w-full max-w-3xl animate-scale-in flex-col overflow-hidden rounded-xl border border-border bg-[#101010] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/35 px-6 py-4">
          <div className="flex flex-col">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
              <Terminal className="w-4 h-4" />
              Detalhes da execucao #{selectedLog.id}
            </h2>
            <span className="text-xs text-muted-foreground font-mono mt-1">
              Workflow: {selectedLog.workflowId}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="relative w-full flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-inner">
              {loading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 text-foreground animate-spin mr-2" />
                  <span className="text-sm">Carregando execucao completa...</span>
                </div>
              ) : (
                <pre className="h-full w-full overflow-auto p-5 text-xs font-mono leading-relaxed text-foreground">
                  {displayText}
                </pre>
              )}
            </div>
            <div className="flex justify-between items-center shrink-0 pt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(displayText)}
                  disabled={loading}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <Copy className="w-3 h-3" /> Copiar
                </button>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {currentLength} caracteres
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-muted/35 px-6 py-4">
          <button
            onClick={onClose}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
