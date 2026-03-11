
import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Trash2, Mail, Shield, Ban, X, LifeBuoy, ChevronDown, CheckCircle2, Search, Lock, LockOpen, Loader2, User } from '../components/ui/Icons';
import { useNotification } from '../context/NotificationContext';
import { controlBaseClass, inputBaseClass } from '../components/inputs/styles';
import { userService } from '../services/userService';
import { ConfirmationModal } from '../components/shared/ConfirmationModal';
import DarkPage from '../components/layout/DarkPage';

const ROOT_ADMIN = 'admin@ebettr.com';

interface AdminUser {
  id?: string;
  email: string;
  role: 'admin' | 'support';
  addedAt: string;
  status?: 'active' | 'blocked';
  name?: string;
  companyId?: string;
}

interface AdminUsersProps {
  currentUserEmail: string;
}

const TableSkeleton = () => (
    <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden animate-pulse">
        <div className="h-12 bg-muted border-b border-border flex items-center px-6">
             <div className="h-4 bg-muted rounded w-1/4"></div>
        </div>
        <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-muted shrink-0"></div>
                        <div className="space-y-2 w-full">
                            <div className="h-3 bg-muted rounded w-1/3"></div>
                            <div className="h-2 bg-muted rounded w-1/4"></div>
                        </div>
                    </div>
                    <div className="w-20 h-4 bg-muted rounded shrink-0"></div>
                </div>
            ))}
        </div>
    </div>
);

export const AdminUsers: React.FC<AdminUsersProps> = ({ currentUserEmail }) => {
  const { addNotification } = useNotification();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'support'>('admin');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Delete Modal
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; user: AdminUser | null }>({ isOpen: false, user: null });
  
  // Dropdown State
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  
  const normalizedCurrentUser = currentUserEmail ? currentUserEmail.toLowerCase().trim() : '';

  const isFetchingRef = useRef(false);
  const fetchUsers = async (showLoading = true) => {
      if (isFetchingRef.current) return;
      
      if (showLoading) setIsLoading(true);
      isFetchingRef.current = true;
      try {
          const data = await userService.list();
          
          const filtered = data
            .filter(u => u.role === 'admin' || u.role === 'support')
            .map(u => ({
                id: u.id,
                email: u.email,
                role: u.role as 'admin' | 'support',
                addedAt: u.created_at,
                status: u.is_blocked ? 'blocked' : 'active',
                name: u.name,
                companyId: u.company_id
            } as AdminUser));

          setAdmins(filtered);
      } catch (error: any) {
          console.error("Failed to fetch admin users", error);
          if (!error.message.includes('Sessão expirada')) {
             addNotification('error', 'Erro', 'Não foi possível carregar a lista de usuários.');
          }
      } finally {
          if (showLoading) setIsLoading(false);
          isFetchingRef.current = false;
      }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const generateRandomPassword = (length = 10) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
    return Array(length).fill(null).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !newName) {
        addNotification('error', 'Campos Obrigatórios', 'Preencha nome e email.');
        return;
    }

    setIsSubmitting(true);
    const autoPassword = generateRandomPassword(10);

    try {
        await userService.create({
            email: newEmail,
            name: newName,
            password: autoPassword,
            role: newRole,
            company_id: null,
            is_blocked: false
        });
        
        navigator.clipboard.writeText(autoPassword);
        addNotification('success', 'Usuário Criado', `Senha gerada: ${autoPassword} (Copiada!)`);
        
        setNewEmail('');
        setNewName('');
        setNewRole('admin');
        fetchUsers();
    } catch (error: any) {
        addNotification('error', 'Erro ao criar', error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleClickRemove = (user: AdminUser) => {
    const targetEmail = user.email.toLowerCase().trim();

    if (targetEmail === ROOT_ADMIN) {
        addNotification('error', 'Ação Proibida', 'Não é possível remover o administrador principal.');
        return;
    }

    if (targetEmail === normalizedCurrentUser) {
        addNotification('warning', 'Ação Proibida', 'Você não pode revogar seu próprio acesso.');
        return;
    }

    if (!user.id) {
        addNotification('error', 'Erro', 'ID do usuário não encontrado. Tente recarregar a página.');
        return;
    }

    setDeleteModal({ isOpen: true, user });
  };

  const handleConfirmDelete = async () => {
    const user = deleteModal.user;
    if (!user || !user.id) return;

    try {
        await userService.delete(user.id);
        addNotification('success', 'Usuário Removido', `${user.name || user.email} foi excluído.`);
        fetchUsers();
    } catch (error: any) {
        addNotification('error', 'Erro ao excluir', error.message);
    } finally {
        setDeleteModal({ isOpen: false, user: null });
    }
  };

  const handleToggleBlock = async (user: AdminUser) => {
      const targetEmail = user.email?.toLowerCase().trim() || '';

      if (targetEmail === ROOT_ADMIN) {
          addNotification('error', 'Ação Proibida', 'Não é possível bloquear o administrador principal.');
          return;
      }

      if (targetEmail === normalizedCurrentUser) {
          addNotification('warning', 'Ação Proibida', 'Você não pode bloquear seu próprio acesso.');
          return;
      }

      if (!user.id) {
          addNotification('error', 'Erro', 'ID do usuário não encontrado.');
          return;
      }

      const isBlocked = user.status === 'blocked';
      
      try {
          if (isBlocked) {
              await userService.unblock(user.id);
              addNotification('success', 'Desbloqueado', `${user.name} agora tem acesso.`);
          } else {
              await userService.block(user.id);
              addNotification('warning', 'Bloqueado', `${user.name} teve o acesso suspenso.`);
          }
          fetchUsers(false);
      } catch (error: any) {
          addNotification('error', 'Erro', error.message);
      }
  };

  const getRoleLabel = (role: string) => {
      return role === 'admin' ? 'Administrador' : 'Suporte Técnico';
  };

  const filteredAdmins = admins.filter(admin => 
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.name && admin.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DarkPage className="min-h-[calc(100vh-4rem)]">
    <div className="animate-fade-in max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-4 mb-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-border rounded-lg flex items-center justify-center text-foreground bg-muted">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">Usuários do Sistema</h1>
                        <p className="text-sm text-muted-foreground mt-0.5 font-light">Gestão de administradores e equipe de suporte.</p>
                    </div>
                </div>
                <div className="relative group w-full max-w-xs hidden sm:block">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-foreground">
                        <Search className="w-4 h-4" />
                    </div>
                    <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground pl-10 h-9" 
                        placeholder="Buscar usuário..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="relative group w-full sm:hidden">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-foreground">
                    <Search className="w-4 h-4" />
                </div>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground pl-10 h-9" 
                    placeholder="Buscar usuário..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                {isLoading ? (
                    <TableSkeleton />
                ) : (
                    <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden min-h-[300px]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        <th className="px-6 py-4">Usuário</th>
                                        <th className="px-6 py-4">Perfil</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {filteredAdmins.map((user) => {
                                        const emailLower = user.email.toLowerCase().trim();
                                        const isRoot = emailLower === ROOT_ADMIN;
                                        const isMe = emailLower === normalizedCurrentUser;
                                        const isBlocked = user.status === 'blocked';
                                        const canModify = !isRoot && !isMe;

                                        return (
                                            <tr key={user.id || user.email} className={`hover:bg-muted transition-colors group ${isBlocked ? 'bg-red-950/40' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-semibold leading-tight ${isBlocked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                                    {user.name || user.email}
                                                                </span>
                                                                {isBlocked && <span className="text-[9px] bg-red-100 text-red-600 border border-red-200 px-1.5 rounded font-bold uppercase">Bloqueado</span>}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] text-muted-foreground">{user.email}</span>
                                                                {isMe && <span className="text-[10px] text-emerald-600 font-bold ml-1">• Você</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {isRoot ? <Shield className="w-4 h-4 text-foreground" /> : user.role === 'admin' ? <Shield className={`w-4 h-4 ${isBlocked ? 'text-muted-foreground' : 'text-muted-foreground'}`} /> : <LifeBuoy className={`w-4 h-4 ${isBlocked ? 'text-muted-foreground' : 'text-muted-foreground'}`} />}
                                                        <span className={`text-xs font-medium ${isRoot ? 'text-foreground font-bold' : isBlocked ? 'text-muted-foreground' : user.role === 'admin' ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                                            {isRoot ? 'Super Admin' : getRoleLabel(user.role)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canModify ? (
                                                            <>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleBlock(user); }} className={`p-2 rounded-lg transition-colors inline-flex z-10 relative cursor-pointer ${isBlocked ? 'text-green-400 hover:bg-green-950/40' : 'text-muted-foreground hover:text-amber-300 hover:bg-amber-950/40'}`} title={isBlocked ? "Desbloquear" : "Bloquear"}>{isBlocked ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}</button>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleClickRemove(user); }} className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors inline-flex z-10 relative cursor-pointer" title="Revogar Acesso"><Trash2 className="w-4 h-4" /></button>
                                                            </>
                                                        ) : (
                                                            <div className="p-2 inline-flex text-muted-foreground cursor-not-allowed opacity-50" title={isRoot ? "Super Admin" : "Você"}><Ban className="w-4 h-4" /></div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {!isLoading && filteredAdmins.length === 0 && (
                    <div className="bg-panel border border-border rounded-xl p-8 text-center text-muted-foreground text-sm mt-4">Nenhum usuário encontrado.</div>
                )}
            </div>

            <div className="md:col-span-1">
                <div className="bg-panel border border-border rounded-xl p-6 shadow-sm sticky top-6">
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Novo Usuário</h3>
                    <form onSubmit={handleAddAdmin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome Completo</label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-muted-foreground"><User className="w-4 h-4" /></div>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className={`${inputBaseClass} pl-9 pr-8`} placeholder="Ex: João Silva" disabled={isSubmitting} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-muted-foreground"><Mail className="w-4 h-4" /></div>
                                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={`${inputBaseClass} pl-9 pr-8`} placeholder="novo@usuario.com" disabled={isSubmitting} />
                            </div>
                        </div>
                        <div className="space-y-1" ref={roleDropdownRef}>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Perfil de Acesso</label>
                            <div className="relative">
                                <button type="button" disabled={isSubmitting} onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)} className={`${controlBaseClass} flex items-center justify-between text-left h-[38px] disabled:opacity-50`}>
                                    <div className="flex items-center gap-2">
                                        {newRole === 'admin' ? <><Shield className="w-3.5 h-3.5 text-muted-foreground" /><span>Administrador</span></> : <><LifeBuoy className="w-3.5 h-3.5 text-muted-foreground" /><span>Suporte Técnico</span></>}
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isRoleDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-scale-in">
                                        <button type="button" onClick={() => { setNewRole('admin'); setIsRoleDropdownOpen(false); }} className="flex h-10 w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"><Shield className="w-3.5 h-3.5 text-muted-foreground" /><span>Administrador</span>{newRole === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />}</button>
                                        <button type="button" onClick={() => { setNewRole('support'); setIsRoleDropdownOpen(false); }} className="flex h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"><LifeBuoy className="w-3.5 h-3.5 text-muted-foreground" /><span>Suporte Técnico</span>{newRole === 'support' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />}</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button type="submit" disabled={!newEmail || !newName || isSubmitting} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            {isSubmitting ? 'Salvando...' : 'Conceder Acesso'}
                        </button>
                        <p className="text-[10px] text-muted-foreground text-center">Uma senha segura será gerada automaticamente.</p>
                    </form>
                    <div className="mt-6 space-y-3">
                        <div className="p-3 bg-muted border border-border rounded-lg text-muted-foreground text-xs leading-relaxed"><p className="font-bold flex items-center gap-1 mb-1 text-foreground"><Shield className="w-3 h-3" /> Administrador</p>Acesso total para gerenciar servidores, empresas, usuários e configurações globais.</div>
                        <div className="p-3 bg-muted border border-border rounded-lg text-muted-foreground text-xs leading-relaxed"><p className="font-bold flex items-center gap-1 mb-1 text-muted-foreground"><LifeBuoy className="w-3 h-3" /> Suporte</p>Pode visualizar agentes, logs de execução e configurações, mas com restrições em ações críticas.</div>
                    </div>
                </div>
            </div>
        </div>

        <ConfirmationModal 
            isOpen={deleteModal.isOpen}
            title="Excluir Usuário?"
            message={`Tem certeza que deseja excluir o usuário ${deleteModal.user?.email}? Esta ação é irreversível e removerá todo o acesso.`}
            onClose={() => setDeleteModal({ isOpen: false, user: null })}
            onConfirm={handleConfirmDelete}
            isDestructive={true}
            confirmLabel="Excluir"
        />
    </div>
    </DarkPage>
  );
};
