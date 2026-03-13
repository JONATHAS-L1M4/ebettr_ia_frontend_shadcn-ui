import { cn } from '../../utils/cn';

export const confirmationOverlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center bg-background/68 p-4 backdrop-blur-[1.5px] animate-fade-in';

export const confirmationSurfaceClass =
  'w-full overflow-hidden rounded-xl border border-border bg-[#101010] shadow-2xl animate-scale-in';

export const confirmationInlineOverlayClass =
  'absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-background/72 p-4 backdrop-blur-[1.5px] animate-fade-in';

export const confirmationInlineSurfaceClass =
  'w-full max-w-[22rem] rounded-xl border border-border bg-[#101010] p-4 text-card-foreground shadow-xl animate-scale-in';

export const confirmationSecondaryButtonClass =
  'flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50';

export const confirmationPrimaryButtonClass =
  'flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50';

export const confirmationDestructiveButtonClass =
  'flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-red-800/70 bg-red-900/70 px-4 py-2 text-sm font-medium text-red-50 transition-all hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50';

export const confirmationIconWrapClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border';

export const getConfirmationIconWrapClass = (isDestructive = false) =>
  cn(
    confirmationIconWrapClass,
    'border-border bg-muted/40 text-muted-foreground'
  );

export const modalOverlayClass = confirmationOverlayClass;

export const modalSurfaceClass = confirmationSurfaceClass;
