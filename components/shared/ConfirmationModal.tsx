
import React from 'react';
import { AlertCircle, AlertTriangle } from '../ui/Icons';
import { ConfirmationDialogShell } from './ConfirmationDialogShell';
import {
  confirmationDestructiveButtonClass,
  confirmationPrimaryButtonClass,
  confirmationSecondaryButtonClass,
  getConfirmationIconWrapClass,
} from './confirmationStyles';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, title, message, onClose, onConfirm, 
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <ConfirmationDialogShell
      isOpen={isOpen}
      title={title}
      description={message}
      onClose={onClose}
      icon={
        <div className={getConfirmationIconWrapClass(isDestructive)}>
          {isDestructive ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
        </div>
      }
      footer={
        <>
          <button onClick={onClose} className={confirmationSecondaryButtonClass}>
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={
              isDestructive
                ? confirmationDestructiveButtonClass
                : confirmationPrimaryButtonClass
            }
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
};
