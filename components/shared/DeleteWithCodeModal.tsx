
import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    if (isOpen) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
      setUserInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60  z-[100] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-card rounded-lg shadow-2xl border border-border max-w-sm w-full p-6 animate-scale-in">
            <div className="flex flex-col items-center text-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground">{title}</h3>
                    <div className="text-sm text-muted-foreground mt-2">
                       {description}
                    </div>
                </div>
                
                <div className="w-full bg-muted p-3 rounded-md border border-border">
                    <p className="text-xl font-mono font-bold text-foreground tracking-widest select-all">
                        {verificationCode}
                    </p>
                </div>

                <input 
                    type="text" 
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Digite o codigo aqui"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground text-center font-mono transition-all"
                    maxLength={6}
                />

                <div className="flex gap-3 w-full pt-2">
                    <button 
                        onClick={onClose}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={userInput !== verificationCode}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-300 shadow-sm transition-all hover:border-red-600 hover:bg-red-700 hover:text-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
