import React, { useState } from 'react';
import { RagDocument } from '../../types';
import { X, FileText, Loader2, Copy, Check } from '../ui/Icons';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: RagDocument | null;
  isLoading: boolean;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ isOpen, onClose, document, isLoading }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (document?.content) {
      navigator.clipboard.writeText(document.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const contentLength = document?.content?.length ?? 0;

  return (
    <div className="fixed inset-0 z-[9999] flex animate-fade-in items-center justify-center bg-background/68 p-4 backdrop-blur-[1.5px]">
      <div className="flex h-[80vh] w-full max-w-4xl animate-scale-in flex-col overflow-hidden rounded-xl border border-border bg-[#101010] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/35 px-6 py-4">
          <div className="flex flex-col">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
              <FileText className="w-4 h-4" />
              Visualizar documento RAG
            </h3>
            <span className="text-xs text-muted-foreground font-mono mt-1 truncate max-w-[70vw] sm:max-w-[520px]">
              {document?.file_name || 'Documento'}
              {document ? ` - ID: ${document.id}` : ''}
              {document?.blobType ? ` - ${document.blobType}` : ''}
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
          <div className="relative w-full flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-inner">
            <div className="h-full w-full overflow-auto p-5 text-sm leading-relaxed text-foreground font-mono whitespace-pre-wrap">
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-foreground" />
                  <span className="text-sm">Carregando conteudo do documento...</span>
                </div>
              ) : document?.content ? (
                document.content
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <FileText className="w-6 h-6 mr-2 opacity-30" />
                  <span className="text-sm">Nao foi possivel carregar o conteudo deste documento.</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center shrink-0 pt-2">
            <div className="flex gap-2">
              {!isLoading && document?.content && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Copiar conteudo"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              )}
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {contentLength} caracteres
            </span>
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
