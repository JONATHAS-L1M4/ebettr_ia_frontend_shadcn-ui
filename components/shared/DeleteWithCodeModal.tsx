
import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from '../ui/Icons';
import { authOtpInputClass } from '../auth/authStyles';
import { ConfirmationDialogShell } from './ConfirmationDialogShell';
import {
  confirmationDestructiveButtonClass,
  confirmationSecondaryButtonClass,
  getConfirmationIconWrapClass,
} from './confirmationStyles';

interface DeleteWithCodeModalProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteWithCodeModal: React.FC<DeleteWithCodeModalProps> = ({ 
  isOpen, 
  title, 
  description, 
  onClose, 
  onConfirm
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
      setUserInput('');
      const focusTimer = setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen]);

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = e.target.value;

    if (value === '') {
      const chars = userInput.split('');
      chars[index] = '';
      setUserInput(chars.join(''));
      return;
    }

    if (!/^\d$/.test(value.slice(-1))) return;

    const chars = userInput.split('');
    for (let i = 0; i < 6; i += 1) {
      if (!chars[i]) chars[i] = '';
    }

    chars[index] = value.slice(-1);
    setUserInput(chars.join('').slice(0, 6));

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Backspace' && !userInput[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    setUserInput(pastedData);
    inputRefs.current[Math.min(pastedData.length - 1, 5)]?.focus();
  };

  if (!isOpen) return null;

  return (
    <ConfirmationDialogShell
      isOpen={isOpen}
      title={title}
      description={description}
      onClose={onClose}
      icon={
        <div className={getConfirmationIconWrapClass(true)}>
          <AlertTriangle className="h-5 w-5" />
        </div>
      }
      footer={
        <>
          <button onClick={onClose} className={confirmationSecondaryButtonClass}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={userInput !== verificationCode}
            className={confirmationDestructiveButtonClass}
          >
            Confirmar
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="mx-auto w-fit rounded-lg bg-muted/40 px-3 py-2 shadow-inner">
          <p className="select-all text-center font-mono text-xl font-bold tracking-[0.24em] text-foreground">
            {verificationCode}
          </p>
        </div>

        <div className="flex justify-center gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              maxLength={1}
              inputMode="numeric"
              value={userInput[index] || ''}
              onChange={(e) => handleInput(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              className={`${authOtpInputClass} h-11 w-10 rounded-lg text-base sm:h-11 sm:w-10`}
              aria-label={`Digito ${index + 1} do codigo`}
            />
          ))}
        </div>
      </div>
    </ConfirmationDialogShell>
  );
};
