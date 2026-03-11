import React, { useEffect, useRef, useState } from 'react';
import { AccessRule } from '../../types';
import { Mail, Plus, User, X } from '../ui/Icons';
import { companyService } from '../../services/companyService';
import { userService } from '../../services/userService';
import { inputBaseClass } from './styles';

interface AccessManagerProps {
  rules: AccessRule[];
  onChange: (rules: AccessRule[]) => void;
  readonly?: boolean;
  selectedCompany?: string;
}

export const AccessManager: React.FC<AccessManagerProps> = ({
  rules,
  onChange,
  readonly = false,
  selectedCompany = '',
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState<
    { email: string; company: string }[]
  >([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, companiesData] = await Promise.all([
          userService.list(),
          companyService.list(),
        ]);

        const formattedUsers = usersData.map((user) => {
          const company = companiesData.find((item) => item.id === user.company_id);
          return {
            email: user.email,
            company: company ? company.name : '',
          };
        });

        setAvailableUsers(formattedUsers);
      } catch (e) {
        console.error('Falha ao carregar lista de usuarios para controle de acesso', e);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const usersInCompany = selectedCompany
    ? availableUsers.filter(
        (user) =>
          user.company &&
          user.company.toLowerCase().trim() === selectedCompany.toLowerCase().trim()
      )
    : availableUsers;

  const filteredOptions = usersInCompany.filter((user) =>
    user.email.toLowerCase().includes(email.toLowerCase())
  );

  const handleSelectUser = (userEmail: string) => {
    setEmail(userEmail);
    setIsDropdownOpen(false);
    setError('');
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Email invalido.');
      return;
    }

    if (rules.some((rule) => rule.email.toLowerCase() === cleanEmail.toLowerCase())) {
      setError('Este usuario ja possui acesso.');
      return;
    }

    const userInScope = usersInCompany.find(
      (user) => user.email.toLowerCase() === cleanEmail.toLowerCase()
    );

    if (!userInScope) {
      const existsGlobal = availableUsers.some(
        (user) => user.email.toLowerCase() === cleanEmail.toLowerCase()
      );

      if (existsGlobal && selectedCompany) {
        setError(`O usuario pertence a outra empresa (nao e ${selectedCompany}).`);
      } else {
        setError('Usuario nao cadastrado. Cadastre-o na tela "Usuarios Clientes" primeiro.');
      }
      return;
    }

    const newRule: AccessRule = {
      email: cleanEmail,
      role: 'client',
      addedAt: new Date().toISOString(),
    };

    onChange([...rules, newRule]);
    setEmail('');
    setError('');
    setIsDropdownOpen(false);
  };

  const handleRemove = (emailToRemove: string) => {
    onChange(rules.filter((rule) => rule.email !== emailToRemove));
  };

  const isDisabled = readonly;

  return (
    <div className="space-y-4">
      {!readonly && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="w-full space-y-1.5" ref={dropdownRef}>
            <label className="ml-1 text-xs font-semibold uppercase tracking-wide text-foreground">
              Selecione Usuario
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground">
                <Mail className="h-4 w-4" />
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder={
                  selectedCompany ? `Buscar usuario em ${selectedCompany}...` : 'Buscar usuario por email...'
                }
                className={`${inputBaseClass} pl-9 ${
                  isDisabled
                    ? 'cursor-not-allowed border-border bg-muted text-muted-foreground'
                    : 'bg-background'
                }`}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd(e)}
                autoComplete="off"
                disabled={isDisabled}
              />

              {isDropdownOpen && filteredOptions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-hidden overflow-y-auto rounded-lg border border-border bg-popover shadow-xl animate-scale-in">
                  {filteredOptions.map((user) => (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => handleSelectUser(user.email)}
                      className="flex w-full items-center justify-between border-b border-border px-4 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-muted/40 hover:text-foreground last:border-0"
                    >
                      <span className="truncate font-medium">{user.email}</span>
                      {user.company && (
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {user.company}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isDisabled}
            className={`flex h-10 w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors md:w-auto ${
              isDisabled
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar</span>
          </button>
        </div>
      )}

      {!readonly && error && (
        <p className="ml-1 text-[10px] font-bold text-destructive">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-panel/50 shadow-sm">
        {rules.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <User className="mx-auto mb-2 h-8 w-8 opacity-20" />
            <p className="text-xs">Nenhum usuario com acesso.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className="group flex items-center justify-between p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-bold text-foreground shadow-sm">
                    {rule.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {rule.email}
                    </p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      Adicionado em{' '}
                      {rule.addedAt
                        ? new Date(rule.addedAt).toLocaleDateString()
                        : 'Data desc.'}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <User className="h-3 w-3" /> Cliente
                  </span>

                  {!readonly && (
                    <button
                      onClick={() => handleRemove(rule.email)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Remover acesso"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
