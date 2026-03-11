import React from 'react';
import { AlertTriangle, Loader2, Trash2 } from '../ui/Icons';

interface DangerZoneSectionProps {
  title: string;
  description: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  actionIcon?: React.ComponentType<{ className?: string }>;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  disabled = false,
  isLoading = false,
  loadingLabel,
  actionIcon: ActionIcon = Trash2
}) => {
  const currentLabel = isLoading ? loadingLabel || actionLabel : actionLabel;

  return (
    <div className="mt-8 pt-8 border-t border-border animate-fade-in">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <AlertTriangle className="w-4 h-4" /> Zona de Perigo
      </h3>
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAction}
          disabled={disabled || isLoading}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ActionIcon className="w-4 h-4" />}
          {currentLabel}
        </button>
      </div>
    </div>
  );
};
