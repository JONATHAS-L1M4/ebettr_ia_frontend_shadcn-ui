import React, { useState, useEffect } from 'react';
import { Alert, AlertCreatePayload, AlertUpdatePayload } from '../types';
import { alertService } from '../services/alertService';
import { useNotification } from '../context/NotificationContext';
import { Plus, Trash2, Edit2, Loader2, AlertTriangle, Info, AlertCircle, ShieldAlert, Bell } from 'lucide-react';
import DarkPage from '../components/layout/DarkPage';
import { ConfirmationModal } from '../components/shared/ConfirmationModal';

const selectBaseClass =
  'w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer';
import {
 Table,
 TableHeader,
 TableBody,
 TableRow,
 TableHead,
 TableCell,
} from '../components/ui/table';

export const AdminAlerts: React.FC = () => {
 const [alerts, setAlerts] = useState<Alert[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
 const [alertToDelete, setAlertToDelete] = useState<string | null>(null);
 const { addNotification } = useNotification();

 const [formData, setFormData] = useState<AlertCreatePayload>({
 title: '',
 message: '',
 level: 'info',
 ttl_seconds: 3600
 });

 const fetchAlerts = async () => {
 setIsLoading(true);
 try {
 const data = await alertService.list();
 setAlerts(data);
 } catch (error) {
 console.error('Failed to fetch alerts:', error);
 addNotification('error', 'Erro', 'Falha ao carregar alertas.');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchAlerts();
 }, []);

 const handleOpenModal = (alert?: Alert) => {
 if (alert) {
 setEditingAlert(alert);
 setFormData({
 title: alert.title,
 message: alert.message,
 level: alert.level,
 ttl_seconds: alert.ttl_seconds
 });
 } else {
 setEditingAlert(null);
 setFormData({
 title: '',
 message: '',
 level: 'info',
 ttl_seconds: 3600
 });
 }
 setIsModalOpen(true);
 };

 const handleCloseModal = () => {
 setIsModalOpen(false);
 setEditingAlert(null);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 if (editingAlert) {
 await alertService.update(editingAlert.id, formData);
 addNotification('success', 'Alerta atualizado', 'O alerta foi atualizado com sucesso.');
 } else {
 await alertService.create(formData);
 addNotification('success', 'Alerta criado', 'O alerta foi criado com sucesso.');
 }
 handleCloseModal();
 fetchAlerts();
 } catch (error) {
 console.error('Failed to save alert:', error);
 addNotification('error', 'Erro', 'Falha ao salvar alerta.');
 }
 };

 const handleDelete = async (id: string) => {
 try {
 await alertService.delete(id);
 addNotification('success', 'Alerta excluído', 'O alerta foi excluído com sucesso.');
 fetchAlerts();
 } catch (error) {
 console.error('Failed to delete alert:', error);
 addNotification('error', 'Erro', 'Falha ao excluir alerta.');
 }
 };

 const getLevelIcon = (level: string) => {
 switch (level) {
 case 'critical': return <ShieldAlert className="w-5 h-5 text-red-600" />;
 case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
 case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
 case 'info':
 default: return <Info className="w-5 h-5 text-muted-foreground" />;
 }
 };

 return (
 <DarkPage className="min-h-[calc(100vh-4rem)]">
 <div className="max-w-7xl mx-auto w-full font-sans">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-border pb-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 border border-border rounded-lg flex items-center justify-center text-foreground bg-muted shrink-0">
 <Bell className="w-5 h-5" />
 </div>
 <div>
 <h1 className="text-xl font-semibold text-foreground tracking-tight">Gerenciar Alertas</h1>
 <p className="text-sm text-muted-foreground mt-0.5 font-light">Crie e gerencie alertas globais para todos os usuários.</p>
 </div>
 </div>
 <button
 onClick={() => handleOpenModal()}
 className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground"
 >
 <Plus className="w-4 h-4" />
 Novo Alerta
 </button>
 </div>

 <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <Table className="w-full text-left border-collapse">
 <TableHeader className="bg-muted border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
 <TableRow>
 <TableHead className="px-6 py-4">Nível</TableHead>
 <TableHead className="px-6 py-4">Título</TableHead>
 <TableHead className="px-6 py-4">Mensagem</TableHead>
 <TableHead className="px-6 py-4 hidden md:table-cell">Expira em</TableHead>
 <TableHead className="px-6 py-4 text-right">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-border text-sm">
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={5} className="px-6 py-12 text-center">
 <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
 </TableCell>
 </TableRow>
 ) : alerts.length === 0 ? (
 <TableRow>
 <TableCell colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
 Nenhum alerta ativo no momento.
 </TableCell>
 </TableRow>
 ) : (
 alerts.map((alert) => (
 <TableRow key={alert.id} className="hover:bg-muted transition-colors">
 <TableCell className="px-6 py-4">
 <div className="flex items-center gap-2">
 {getLevelIcon(alert.level)}
 <span className="capitalize font-medium text-muted-foreground">{alert.level}</span>
 </div>
 </TableCell>
 <TableCell className="px-6 py-4 font-medium text-foreground">{alert.title}</TableCell>
 <TableCell className="px-6 py-4 text-muted-foreground max-w-xs truncate" title={alert.message}>{alert.message}</TableCell>
 <TableCell className="px-6 py-4 text-muted-foreground hidden md:table-cell">
 {new Date(alert.expires_at).toLocaleString()}
 </TableCell>
 <TableCell className="px-6 py-4 text-right">
 <div className="flex items-center justify-end gap-2">
 <button
 onClick={() => handleOpenModal(alert)}
 className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
 title="Editar"
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => setAlertToDelete(alert.id)}
 className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-950/40 rounded-md transition-colors"
 title="Excluir"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </div>

 {isModalOpen && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden">
 <div className="px-6 py-4 border-border flex justify-between items-center">
 <h2 className="text-lg font-bold text-foreground">
 {editingAlert ? 'Editar Alerta' : 'Novo Alerta'}
 </h2>
 </div>
 
 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <div>
 <label className="block text-sm font-medium text-muted-foreground mb-1">Título</label>
 <input
 type="text"
 required
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 className="w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground"
 placeholder="Ex: Manutenção Programada"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-muted-foreground mb-1">Mensagem</label>
 <textarea
 required
 value={formData.message}
 onChange={(e) => setFormData({ ...formData, message: e.target.value })}
 rows={3}
 className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
 placeholder="Detalhes do alerta..."
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-muted-foreground mb-1">Nível</label>
 <select
 value={formData.level}
 onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
 className={selectBaseClass}
 >
 <option value="info">Info</option>
 <option value="warning">Warning</option>
 <option value="error">Error</option>
 <option value="critical">Critical</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-muted-foreground mb-1">Duração (segundos)</label>
 <input
 type="number"
 required
 min="60"
 value={formData.ttl_seconds}
 onChange={(e) => setFormData({ ...formData, ttl_seconds: parseInt(e.target.value) || 3600 })}
 className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
 />
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
 <button
 type="button"
 onClick={handleCloseModal}
 className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground"
 >
 Cancelar
 </button>
 <button
 type="submit"
 className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground"
 >
 Salvar
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 <ConfirmationModal
 isOpen={alertToDelete !== null}
 title="Excluir Alerta?"
 message="Tem certeza que deseja excluir este alerta? Esta ação é irreversível."
 onClose={() => setAlertToDelete(null)}
 onConfirm={() => {
 if (alertToDelete) {
 handleDelete(alertToDelete);
 }
 setAlertToDelete(null);
 }}
 confirmLabel="Excluir"
 isDestructive
 />
 </div>
 </DarkPage>
 );
};




