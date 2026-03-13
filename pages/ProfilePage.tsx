
import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, ShieldCheck, Save, Lock, Smartphone, QrCode, Loader2, CheckCircle2, ArrowLeft, X, Eye, EyeOff } from '../components/ui/Icons';
import { useNotification } from '../context/NotificationContext';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import Toggle from '../components/ui/Toggle';
import DarkPage from '../components/layout/DarkPage';

interface ProfilePageProps {
  user: UserProfile;
  onSave: (updatedUser: Partial<UserProfile>) => void;
  onBack?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onSave, onBack }) => {
  const { addNotification } = useNotification();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // General Form State
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role
  });

  // Security Form State
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // Visibility States
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(user.twoFactorEnabled || false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false); // Controls the Modal
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // 2FA Reset State
  const [isResetting2FA, setIsResetting2FA] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResettingLoading, setIsResettingLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  // Setup Data State (From API)
  const [setupData, setSetupData] = useState<{ secret: string; otpauth_url: string; csrf_token: string; qr_base64: string } | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(false);

  // Password Strength Logic
  const validations = [
      { id: 'len', label: 'Pelo menos 8 caracteres', test: (p: string) => p.length >= 8 },
      { id: 'upper', label: 'Letra maiúscula (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
      { id: 'lower', label: 'Letra minúscula (a-z)', test: (p: string) => /[a-z]/.test(p) },
      { id: 'num', label: 'Número (0-9)', test: (p: string) => /[0-9]/.test(p) },
      { id: 'spec', label: 'Caractere especial (!@#$)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const passedCount = validations.reduce((acc, val) => acc + (val.test(passwordForm.new) ? 1 : 0), 0);
  const strengthPercentage = Math.min((passedCount / 5) * 100, 100);
  const allValid = passedCount === 5;

  let strengthColor = 'bg-muted';
  let strengthLabel = '';
  
  if (passwordForm.new.length > 0) {
      if (passedCount <= 2) {
          strengthColor = 'bg-red-500';
          strengthLabel = 'Fraca';
      } else if (passedCount <= 4) {
          strengthColor = 'bg-amber-500';
          strengthLabel = 'Média';
      } else {
          strengthColor = 'bg-emerald-500';
          strengthLabel = 'Forte';
      }
  }

  // Sync state if user prop changes
  useEffect(() => {
      setIs2FAEnabled(user.twoFactorEnabled || false);
  }, [user.twoFactorEnabled]);

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'admin': return 'Administrador';
      case 'support': return 'Suporte Técnico';
      case 'client': return 'Cliente';
      default: return role;
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name: formData.name });
    addNotification('success', 'Perfil atualizado', 'Suas informações básicas foram salvas.');
  };

  const handleSaveSecurity = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.new) return;
    
    if (passwordForm.new !== passwordForm.confirm) {
      addNotification('error', 'Erro na senha', 'A nova senha e a confirmação não coincidem.');
      return;
    }

    if (!allValid) {
        addNotification('error', 'Senha Fraca', 'A nova senha não atende aos requisitos de segurança.');
        return;
    }

    setIsSavingSecurity(true);
    try {
        await authService.updatePassword(passwordForm.current, passwordForm.new, passwordForm.confirm);
        addNotification('success', 'Senha alterada', 'Sua credencial de acesso foi atualizada.');
        setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
        addNotification('error', 'Erro', error.message || 'Não foi possível alterar a senha.');
    } finally {
        setIsSavingSecurity(false);
    }
  };

  const handleStartSetup = async () => {
      setIsSettingUp2FA(true);
      setIsLoadingSetup(true);
      setSetupData(null);
      setVerificationCode('');

      try {
          // Usa o serviço para obter os dados de setup
          const data = await authService.setup2FA(user.email);
          
          setSetupData({
              secret: data.secret,
              otpauth_url: data.otpauth_url,
              csrf_token: data.csrf_token,
              qr_base64: data.qr_base64 // Captura o QR Code enviado pelo backend
          });

      } catch (e: any) {
          console.error(e);
          addNotification('error', 'Erro', e.message || 'Não foi possível iniciar a configuração 2FA.');
          setIsSettingUp2FA(false);
      } finally {
          setIsLoadingSetup(false);
      }
  };

  const handleVerify2FA = async () => {
    if (!setupData) return;
    
    setIsVerifying(true);
    
    try {
        // Usa o endpoint de confirmação correto (/authenticator/confirm)
        await authService.confirm2FASetup(user.email, verificationCode, setupData.csrf_token);

        // Success
        setIs2FAEnabled(true);
        setIsSettingUp2FA(false);
        setVerificationCode('');
        onSave({ twoFactorEnabled: true });
        addNotification('success', '2FA Ativado', 'Sua conta agora está protegida com dois fatores.');

    } catch (err: any) {
        console.error(err);
        addNotification('error', 'Erro de Verificação', err.message || 'Não foi possível verificar o código.');
    } finally {
        setIsVerifying(false);
    }
  };

  const handleDisable2FA = () => {
      setIsResetting2FA(true);
      setResetPassword('');
  };

  const handleConfirmReset2FA = async () => {
      if (!resetPassword) return;
      setIsResettingLoading(true);
      try {
          await authService.reset2FA(resetPassword);
          setIs2FAEnabled(false);
          onSave({ twoFactorEnabled: false });
          addNotification('success', '2FA Desativado', 'A autenticação de dois fatores foi removida.');
          setIsResetting2FA(false);
      } catch (err: any) {
          addNotification('error', 'Erro', err.message || 'Senha incorreta.');
      } finally {
          setIsResettingLoading(false);
      }
  };

  // 2FA Input Handlers
  const handle2FAInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    
    // Handle clear
    if (val === '') {
        const chars = verificationCode.split('');
        chars[index] = ''; 
        setVerificationCode(chars.join(''));
        return;
    }

    // Only digit
    if (!/^\d$/.test(val.slice(-1))) return; 
    
    const char = val.slice(-1);
    const chars = verificationCode.split('');
    // Fill gaps
    for (let i = 0; i < 6; i++) {
        if (!chars[i]) chars[i] = '';
    }
    chars[index] = char;
    setVerificationCode(chars.join('').slice(0, 6));

    if (index < 5) {
        inputRefs.current[index + 1]?.focus();
    }
  };

  const handle2FAKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
    }
  };

  const handle2FAPaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (pastedData) {
          setVerificationCode(pastedData);
          inputRefs.current[Math.min(pastedData.length - 1, 5)]?.focus();
      }
  };

  const inputClass = "w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground";

  return (
    <DarkPage className="min-h-[calc(100vh-4rem)]">
    <div className="animate-fade-in max-w-3xl mx-auto pb-12 relative">
        {/* Header Style Match: CreateAgentForm */}
        <div className="flex items-center gap-4 mb-8">
           {onBack && (
               <button 
                 onClick={onBack}
                 className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-border hover:text-foreground text-muted-foreground transition-colors bg-card"
               >
                 <ArrowLeft className="w-4 h-4" />
               </button>
           )}
           <div>
             <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
             <p className="text-sm text-muted-foreground font-light">
                Gerencie suas informações pessoais e segurança.
             </p>
           </div>
        </div>

        <div className="bg-panel rounded-lg border border-border shadow-sm overflow-visible flex flex-col">
            <div className="p-8 flex flex-col gap-10">
                
                {/* Section 1: Identity */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
                        <User className="w-3 h-3" /> Identidade
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome Completo</label>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className={inputClass}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nível de Acesso</label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-muted-foreground">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <input 
                                    type="text" 
                                    value={getRoleLabel(formData.role)}
                                    disabled
                                    className={`${inputClass} pl-9 bg-muted text-muted-foreground cursor-not-allowed`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email (Login)</label>
                        <div className="relative">
                            <div className="absolute left-3 top-2.5 text-muted-foreground">
                                <Mail className="w-4 h-4" />
                            </div>
                            <input 
                                type="email" 
                                value={formData.email}
                                disabled
                                className={`${inputClass} pl-9 bg-muted text-muted-foreground cursor-not-allowed`}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Security (Password) */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
                        <Lock className="w-3 h-3" /> Segurança da Conta
                    </h3>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Senha Atual</label>
                            <div className="relative group">
                                <input 
                                    type={showCurrentPassword ? "text" : "password"} 
                                    value={passwordForm.current}
                                    onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                                    className={`${inputClass} pr-10`}
                                    placeholder="********"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-3 -mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nova Senha</label>
                                <div className="relative group">
                                    <input 
                                        type={showNewPassword ? "text" : "password"} 
                                        value={passwordForm.new}
                                        onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                                        className={`${inputClass} pr-10`}
                                        placeholder="********"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-3 -mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {/* Barra de Força Simplificada */}
                                <div className="px-1 mt-2">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Força da senha</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                            passedCount <= 2 ? 'text-red-500' : passedCount <= 4 ? 'text-amber-500' : 'text-emerald-600'
                                        }`}>
                                            {strengthLabel}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 ease-out ${strengthColor}`} 
                                            style={{ width: `${strengthPercentage}%` }}
                                        />
                                    </div>
                                    {!allValid && passwordForm.new.length > 0 && (
                                        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                                            Use pelo menos 8 caracteres, incluindo letras maiúsculas, números e símbolos especiais.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirmar Senha</label>
                                <div className="relative group">
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        value={passwordForm.confirm}
                                        onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                                        className={`${inputClass} pr-10`}
                                        placeholder="********"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-3 -mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button 
                                type="button" 
                                onClick={handleSaveSecurity}
                                disabled={!passwordForm.current || !passwordForm.new || (passwordForm.new.length > 0 && !allValid) || isSavingSecurity}
                                className="px-4 py-2 bg-card border border-border text-muted-foreground hover:border-border hover:text-foreground text-xs font-bold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                            >
                                {isSavingSecurity ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Atualizar Senha
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 3: 2FA */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
                        <Smartphone className="w-3 h-3" /> Autenticação de Dois Fatores
                    </h3>

                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg border ${is2FAEnabled ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' : 'bg-muted border-border text-muted-foreground'}`}>
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                Status do 2FA
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm">
                                Proteja sua conta exigindo um código do Google Authenticator ou Authy ao fazer login.
                            </p>
                            
                            <div className="mt-4">
                                {!is2FAEnabled ? (
                                    <button 
                                        onClick={handleStartSetup}
                                        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground"
                                    >
                                        <QrCode className="w-3 h-3" />
                                        Configurar 2FA
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleDisable2FA}
                                        className="px-4 py-2 border border-red-900/50 text-red-400 hover:bg-red-950/40 rounded-md text-xs font-bold transition-all"
                                    >
                                        Desativar 2FA
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Style Match: CreateAgentForm */}
            <div className="p-6 bg-muted border-t border-border flex items-center justify-end gap-3 rounded-b-lg">
                <button 
                    onClick={handleSaveGeneral}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground"
                >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                </button>
            </div>
        </div>

        {/* 2FA SETUP MODAL (POP-UP) */}
        {isSettingUp2FA && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/68 p-4 backdrop-blur-[1.5px] animate-fade-in">
                <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-[#101010] shadow-2xl animate-scale-in">
                    
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-card border border-border rounded-md">
                                <QrCode className="w-5 h-5 text-foreground" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Configurar 2FA</h3>
                                <p className="text-xs text-muted-foreground">Escaneie o código para vincular seu app.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsSettingUp2FA(false)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    {isLoadingSetup ? (
                        <div className="flex flex-col items-center justify-center h-64 w-full">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
                            <span className="text-xs text-muted-foreground font-medium">Gerando chave de segurança...</span>
                        </div>
                    ) : (
                        <div className="p-8 flex flex-col md:flex-row gap-8 items-center">
                            
                            {/* Left: QR Code */}
                            <div className="flex flex-col items-center gap-4 w-full md:w-auto md:shrink-0 md:border-r md:border-border md:pr-8">
                                <div className="bg-card p-2 rounded-xl border border-border shadow-sm flex items-center justify-center w-40 h-40 aspect-square bg-card">
                                    {setupData?.qr_base64 ? (
                                        <img
                                            src={setupData.qr_base64}
                                            alt="QR Code do 2FA"
                                            className="h-full w-full rounded-lg bg-black object-contain p-1 [image-rendering:pixelated] invert"
                                        />
                                    ) : (
                                        <div className="text-xs text-muted-foreground">Carregando QR Code...</div>
                                    )}
                                </div>
                                {setupData?.secret && (
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Chave Secreta</span>
                                        <span className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded border border-border select-all">
                                            {setupData.secret}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Right: Steps */}
                            <div className="flex-1 flex flex-col justify-center items-center gap-6 w-full text-center">
                                
                                <div className="space-y-2 flex flex-col items-center">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
                                        Escaneie o código
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px]">
                                        Use um app como <strong>Google Authenticator</strong> ou <strong>Authy</strong> para escanear o QR code ao lado.
                                    </p>
                                </div>

                                <div className="space-y-3 flex flex-col items-center">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</span>
                                        Digite o código
                                    </h4>
                                    <div className="flex gap-2 justify-center">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <input
                                                key={index}
                                                ref={(el) => { inputRefs.current[index] = el; }}
                                                type="text"
                                                maxLength={1}
                                                value={verificationCode[index] || ''}
                                                onChange={(e) => handle2FAInput(e, index)}
                                                onKeyDown={(e) => handle2FAKeyDown(e, index)}
                                                onPaste={handle2FAPaste}
                                                onFocus={(e) => e.target.select()}
                                                className="w-10 h-12 text-center text-xl font-bold bg-card border border-border rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm text-foreground placeholder:text-muted-foreground"
                                            />
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* Modal Footer */}
                    <div className="px-6 py-4 bg-muted border-t border-border flex justify-end gap-3">
                        <button 
                            onClick={() => setIsSettingUp2FA(false)}
                            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleVerify2FA}
                            disabled={verificationCode.length !== 6 || isVerifying || isLoadingSetup}
                            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Verificar e Ativar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 2FA RESET CONFIRMATION MODAL */}
        {isResetting2FA && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/68 p-4 backdrop-blur-[1.5px] animate-fade-in">
                <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-[#101010] shadow-2xl animate-scale-in">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                            Confirmar Desativação
                        </h3>
                        <button onClick={() => setIsResetting2FA(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-muted-foreground mb-4">Para sua segurança, confirme sua senha atual para desativar a autenticação de dois fatores.</p>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Senha Atual</label>
                            <div className="relative group">
                                <input 
                                    type={showResetPassword ? "text" : "password"}
                                    value={resetPassword}
                                    onChange={e => setResetPassword(e.target.value)}
                                    className={inputClass}
                                    placeholder="********"
                                    autoFocus
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowResetPassword(!showResetPassword)}
                                    className="absolute right-3 top-3 -mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-muted border-t border-border flex justify-end gap-3">
                        <button 
                            onClick={() => setIsResetting2FA(false)}
                            className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirmReset2FA}
                            disabled={!resetPassword || isResettingLoading}
                            className="h-10 bg-red-600 text-white px-6 py-2 rounded-md text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {isResettingLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                            Desativar 2FA
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    </DarkPage>
  );
};
