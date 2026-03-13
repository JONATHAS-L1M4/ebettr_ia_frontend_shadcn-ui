import React from 'react';
import { X } from '../ui/Icons';
import { cn } from '../../utils/cn';
import {
  confirmationOverlayClass,
  confirmationSurfaceClass,
} from './confirmationStyles';

interface ConfirmationDialogShellProps {
  isOpen: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  children?: React.ReactNode;
  footer: React.ReactNode;
  maxWidthClass?: string;
  closeOnBackdrop?: boolean;
  overlayClassName?: string;
  surfaceClassName?: string;
}

export const ConfirmationDialogShell: React.FC<
  ConfirmationDialogShellProps
> = ({
  isOpen,
  title,
  description,
  icon,
  onClose,
  children,
  footer,
  maxWidthClass = 'max-w-[22rem]',
  closeOnBackdrop = true,
  overlayClassName,
  surfaceClassName,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div
      className={cn(confirmationOverlayClass, overlayClassName)}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(confirmationSurfaceClass, maxWidthClass, surfaceClassName)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative p-4 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3.5 flex items-start gap-3 pr-10">
            {icon}

            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">
                {title}
              </h3>
              {description && (
                <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </div>
              )}
            </div>
          </div>

          {children && <div className="mb-3.5">{children}</div>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
};
