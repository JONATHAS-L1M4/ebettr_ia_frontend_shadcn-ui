import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserSession } from '../../types';
import {
  ChevronDown,
  Globe,
  Laptop,
  Loader2,
  LockOpen,
  LogOut,
  MapPin,
  Smartphone,
  X,
} from '../ui/Icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface SessionsTableProps {
  sessions: UserSession[];
  onRevoke: (id: string) => void;
  revokingId?: string | null;
  onBlock: (email: string) => void;
  onUnblock: (email: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const controlButtonClass =
  'inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-md bg-card shadow-sm border border-border hover:bg-accent';

const iconButtonClass =
  'inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export const SessionsTable: React.FC<SessionsTableProps> = ({
  sessions,
  onRevoke,
  revokingId,
  onBlock: _onBlock,
  onUnblock,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  selectedIds,
  onSelectionChange,
}) => {
  const [mapLocation, setMapLocation] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const visibleSessionIds = useMemo(() => sessions.map((session) => session.id), [sessions]);
  const selectedVisibleCount = visibleSessionIds.filter((id) => selectedIds.includes(id)).length;

  const isAllSelected =
    sessions.length > 0 && visibleSessionIds.every((id) => selectedIds.includes(id));
  const isPartialSelected = selectedVisibleCount > 0 && !isAllSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isPartialSelected;
    }
  }, [isPartialSelected]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange(selectedIds.filter((id) => !visibleSessionIds.includes(id)));
      return;
    }

    onSelectionChange(Array.from(new Set([...selectedIds, ...visibleSessionIds])));
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }

    onSelectionChange([...selectedIds, id]);
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) {
      return (
        <span className="rounded-full border border-red-900/50 bg-red-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
          Critico ({score}%)
        </span>
      );
    }

    if (score >= 50) {
      return (
        <span className="rounded-full border border-amber-900/50 bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
          Medio ({score}%)
        </span>
      );
    }

    return (
      <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
        Baixo ({score}%)
      </span>
    );
  };

  const getStatusLabel = (session: UserSession) => {
    if (session.status === 'active') {
      return session.isOnline ? 'Online agora' : 'Ativa';
    }

    if (session.status === 'blocked') {
      return 'Bloqueada';
    }

    return 'Encerrada';
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getDeviceIcon = (device: string) => {
    const normalizedDevice = device.toLowerCase();

    if (
      normalizedDevice.includes('mobile') ||
      normalizedDevice.includes('android') ||
      normalizedDevice.includes('iphone')
    ) {
      return <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />;
    }

    return <Laptop className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const formatTimeAgo = (seconds: number) => {
    if (seconds < 60) return `${seconds}s atras`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m atras`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h atras`;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-panel shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h3 className="text-base font-bold text-foreground">Sessoes Ativas & Historico</h3>
            <p className="hidden text-xs font-light text-muted-foreground sm:block">
              Monitoramento consolidado de acessos em tempo real.
            </p>
            <p className="mt-0.5 text-[10px] font-light text-muted-foreground sm:hidden">
              Acompanhe sessoes, risco e dispositivo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {selectedIds.length > 0 && (
              <span className="rounded-md border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm">
                {selectedIds.length} selecionadas
              </span>
            )}
            {isLoadingMore && (
              <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm">
                <Loader2 className="h-3 w-3 animate-spin" />
                Carregando
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full border-collapse text-left">
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <TableHead className="w-10 px-5 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border border-border bg-background"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="px-5 py-3">Status</TableHead>
              <TableHead className="px-5 py-3">Usuario / IP</TableHead>
              <TableHead className="hidden px-5 py-3 md:table-cell">Dispositivo</TableHead>
              <TableHead className="hidden px-5 py-3 md:table-cell">Localizacao</TableHead>
              <TableHead className="hidden px-5 py-3 sm:table-cell">Risco</TableHead>
              <TableHead className="hidden px-5 py-3 lg:table-cell">Cronologia</TableHead>
              <TableHead className="px-5 py-3 text-center">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border text-sm">
            {sessions.length > 0 ? (
              sessions.map((session) => {
                const isSelected = selectedIds.includes(session.id);

                return (
                  <TableRow
                    key={session.id}
                    className={`group transition-colors ${
                      isSelected ? 'bg-accent/20 hover:bg-accent/30' : 'hover:bg-accent/40'
                    }`}
                  >
                    <TableCell className="whitespace-nowrap px-5 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border border-border bg-background"
                        checked={isSelected}
                        onChange={() => handleSelectRow(session.id)}
                      />
                    </TableCell>

                    <TableCell className="whitespace-nowrap px-5 py-3 text-xs font-semibold text-foreground">
                      {getStatusLabel(session)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap px-5 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">
                          {session.email}
                        </span>
                        <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {session.ip}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap px-5 py-3 md:table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {getDeviceIcon(session.device)}
                          <span>{session.browser}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap px-5 py-3 md:table-cell">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span>{session.location}</span>
                        {session.location_json?.latitude && session.location_json?.longitude && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setMapLocation({
                                lat: session.location_json!.latitude,
                                lng: session.location_json!.longitude,
                                label: session.location,
                              });
                            }}
                            className={`${iconButtonClass} -ml-1 p-1 hover:bg-accent hover:text-foreground`}
                            title="Ver no mapa"
                          >
                            <MapPin className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap px-5 py-3 sm:table-cell">
                      {getRiskBadge(session.riskScore)}
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap px-5 py-3 lg:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          <span className="mr-1.5 font-bold text-muted-foreground">Inicio:</span>
                          {formatDate(session.loginTime)}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          <span className="mr-1.5 font-bold text-muted-foreground">
                            {session.status === 'active' ? 'Ultimo:' : 'Fim:'}
                          </span>
                          {formatDate(session.lastActive)}
                        </span>
                        {session.lastSeenSecondsAgo !== undefined && session.status === 'active' && (
                          <span className="font-mono text-[10px] text-emerald-300">
                            <span className="mr-1.5 font-bold text-emerald-400">Visto:</span>
                            {formatTimeAgo(session.lastSeenSecondsAgo)}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {session.status === 'active' && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onRevoke(session.id);
                            }}
                            disabled={revokingId === session.id}
                            className={`${iconButtonClass} hover:bg-red-950/40 hover:text-destructive`}
                            title="Derrubar sessao"
                          >
                            {revokingId === session.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <LogOut className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {session.status === 'blocked' && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onUnblock(session.email);
                            }}
                            className={`${iconButtonClass} hover:bg-emerald-950/40 hover:text-emerald-300`}
                            title="Desbloquear acesso"
                          >
                            <LockOpen className="h-4 w-4" />
                          </button>
                        )}

                        {session.status === 'revoked' && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            -
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="px-5 py-12 text-center italic text-muted-foreground"
                >
                  Nenhuma sessao encontrada para os filtros atuais.
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
              Mostrando {sessions.length}{' '}
              {sessions.length === 1 ? 'sessao visivel' : 'sessoes visiveis'}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {selectedIds.length > 0
                ? `${selectedIds.length} selecionadas`
                : hasMore
                  ? 'Mais historico disponivel'
                  : 'Historico carregado'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasMore ? (
              <button
                type="button"
                onClick={() => onLoadMore?.()}
                disabled={isLoadingMore}
                className={controlButtonClass}
              >
                {isLoadingMore ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {isLoadingMore ? 'Carregando' : 'Carregar mais'}
              </button>
            ) : (
              <span className="rounded-md border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm">
                Fim da lista
              </span>
            )}
          </div>
        </div>
      </div>

      {mapLocation && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-2xl">
            <div className="flex items-center justify-between border-border bg-muted px-4 py-3">
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Localizacao: {mapLocation.label}</h3>
              </div>
              <button
                onClick={() => setMapLocation(null)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[400px] w-full bg-muted">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${mapLocation.lat},${mapLocation.lng}&z=15&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
