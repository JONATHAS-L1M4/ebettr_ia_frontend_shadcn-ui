import React from 'react';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type AlertVariant = 'default' | 'destructive';

interface AlertProps extends React.ComponentProps<'div'> {
  variant?: AlertVariant;
}

const alertVariants: Record<AlertVariant, string> = {
  default: 'border-border bg-card text-foreground',
  destructive: 'border-destructive/20 bg-card text-foreground',
};

export function Alert({
  className,
  variant = 'default',
  ...props
}: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        'relative w-full rounded-xl border px-4 py-3 text-left text-sm shadow-sm',
        alertVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('pr-8 text-sm font-semibold tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-sm leading-relaxed text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export function AlertAction({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn('absolute right-2 top-2', className)}
      {...props}
    />
  );
}
