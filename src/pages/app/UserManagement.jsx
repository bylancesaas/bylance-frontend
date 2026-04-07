import { useEffect, useState, useMemo, useRef } from 'react';
import { useConfirm } from '@/components/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, Users, Loader2, Search, X, Eye, EyeOff,
  ShieldCheck, UserCheck, UserX, Crown, Wrench, ClipboardList,
  UserCog, BarChart3, CheckCircle2, XCircle, Lock, Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────────────────
const ROLES = {
  director:  { label: 'Diretor',     Icon: Crown,      color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  assistant: { label: 'Assistente',  Icon: UserCog,    color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  mechanic:  { label: 'Técnico',      Icon: Wrench,     color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
};

// What each role can access — for the detail view
const ROLE_PERMISSIONS = {
  director: {
    label: 'Acesso completo — pode gerenciar todos os módulos',
    modules: ['Clientes', 'Veículos', 'Ordens de Serviço', 'Garantias', 'Financeiro', 'Serviços', 'Itens', 'Usuários'],
    canDelete: true, canManageUsers: true,
  },
  assistant: {
    label: 'Acesso operacional — pode cadastrar e editar, sem exclusão de dados críticos',
    modules: ['Clientes', 'Veículos', 'Ordens de Serviço', 'Garantias', 'Financeiro', 'Serviços', 'Itens'],
    canDelete: false, canManageUsers: false,
  },
  mechanic: {
    label: 'Acesso técnico — focado em ordens de serviço',
    modules: ['Ordens de Serviço', 'Clientes', 'Veículos'],
    canDelete: false, canManageUsers: false,
  },
};

const ALL_MODULES = ['Clientes', 'Veículos', 'Ordens de Serviço', 'Garantias', 'Financeiro', 'Serviços', 'Itens', 'Usuários'];

const emptyForm = { name: '', email: '', password: '', confirmPassword: '', role: 'mechanic', active: true };

// ── Helpers ────────────────────────────────────────────────────────────────────────────────
const dateBR = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ── RoleBadge ───────────────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const cfg = ROLES[role] || { label: role, Icon: UserCog, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted-foreground/20' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Section divider ────────────────────────────────────────────────────────────────────────
function Section({ icon: Icon, label, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

// ── PasswordInput ──────────────────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder, required }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value} onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="pr-10"
        autoComplete="new-password"
      />
      <button type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const [confirmModal, confirm] = useConfirm();
  const { user: currentUser } = useAuth();

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]         = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [viewUser, setViewUser]     = useState(null);

  const load = async () => {
    try {
      const r = await api.get('/users');
      setUsers(r.data.data || []);
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // ── Computed ──
  const kpi = useMemo(() => {
    const active   = users.filter(u => u.active).length;
    const byRole   = Object.fromEntries(Object.keys(ROLES).map(r => [r, users.filter(u => u.role === r).length]));
    return { total: users.length, active, inactive: users.length - active, byRole };
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterStatus === 'active' && !u.active) return false;
      if (filterStatus === 'inactive' && u.active) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [users, filterRole, filterStatus, search]);

  const hasFilters = !!(search || filterRole !== 'all' || filterStatus !== 'all');

  // ── Handlers ──
  const openNew = () => {
    setEditing(null); setForm(emptyForm); setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', confirmPassword: '', role: u.role, active: u.active });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!isValidEmail(form.email)) errs.email = 'E-mail inválido';
    if (!editing && !form.password) errs.password = 'Senha é obrigatória';
    if (form.password && form.password.length < 8) errs.password = 'Mínimo 8 caracteres';
    if (form.password && form.password !== form.confirmPassword) errs.confirmPassword = 'Senhas não coincidem';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const data = { name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role };
    if (form.password) data.password = form.password;
    if (editing) data.active = form.active;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, data);
        toast.success('Usuário atualizado', { description: 'As alterações foram salvas com sucesso.' });
      } else {
        await api.post('/users', data);
        toast.success('Usuário criado', { description: `${form.name.trim()} já pode acessar o sistema.` });
      }
      setDialogOpen(false); load();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('email') || err.response?.status === 409) {
        setFormErrors(f => ({ ...f, email: 'E-mail já em uso' }));
        toast.error('E-mail já cadastrado');
      } else {
        toast.error(msg || 'Não foi possível salvar o usuário');
      }
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (u) => {
    setTogglingId(u.id);
    const next = !u.active;
    try {
      await api.put(`/users/${u.id}`, { active: next });
      toast.success(next ? `${u.name} foi reativado` : `${u.name} foi desativado`);
      load();
    } catch { toast.error('Erro ao alterar status'); }
    finally { setTogglingId(null); }
  };

  const handleDelete = async (u) => {
    const ok = await confirm({
      title: 'Excluir usuário?',
      description: `O usuário perderá acesso imediatamente e será removido permanentemente. Esta ação não pode ser desfeita. Considere desativar o usuário em vez de excluí-lo para preservar o histórico.`,
      item: `${u.name} (${u.email})`,
      confirmLabel: 'Excluir permanentemente',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingId(u.id);
    try {
      await api.delete(`/users/${u.id}`);
      toast.success('Usuário excluído', { description: 'O registro foi removido permanentemente.' });
      load();
    } catch { toast.error('Erro ao excluir usuário'); }
    finally { setDeletingId(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      {confirmModal}

      <PageHeader
        title="Gestão de Acesso"
        description="Usuários, perfis e permissões do sistema"
      >
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Novo usuário</Button>
      </PageHeader>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total',    value: kpi.total,             Icon: Users,       color: 'text-primary',    bg: 'bg-primary/5' },
          { label: 'Ativos',   value: kpi.active,            Icon: UserCheck,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Inativos', value: kpi.inactive,          Icon: UserX,       color: 'text-red-500',    bg: 'bg-red-50' },
          { label: 'Diretores', value: kpi.byRole.director || 0, Icon: Crown,   color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Técnicos',  value: kpi.byRole.mechanic || 0, Icon: Wrench, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg ${k.bg} flex items-center justify-center flex-shrink-0`}>
              <k.Icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold leading-tight">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9" value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {['all', ...Object.keys(ROLES)].map(r => (
            <button key={r} type="button"
              onClick={() => setFilterRole(r)}
              className={cn(
                'h-10 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap',
                filterRole === r
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background border-input text-muted-foreground hover:text-foreground',
              )}>
              {r === 'all' ? 'Todos' : ROLES[r].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[['all', 'Status'], ['active', 'Ativos'], ['inactive', 'Inativos']].map(([v, l]) => (
            <button key={v} type="button"
              onClick={() => setFilterStatus(v)}
              className={cn(
                'h-10 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap',
                filterStatus === v
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background border-input text-muted-foreground hover:text-foreground',
              )}>
              {l}
            </button>
          ))}
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm"
            onClick={() => { setSearch(''); setFilterRole('all'); setFilterStatus('all'); }}
            className="gap-1 text-muted-foreground whitespace-nowrap">
            <X className="w-3.5 h-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <div className="flex items-center px-4 py-2.5 border-b border-border">
          <span className="text-xs text-muted-foreground">
            {filtered.length === users.length
              ? `${users.length} usuário${users.length !== 1 ? 's' : ''}`
              : `${filtered.length} de ${users.length}`}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => {
              const isSelf = currentUser?.id === u.id;
              return (
                <TableRow key={u.id} className={cn(!u.active && 'opacity-60')}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
                        u.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold leading-tight">{u.name}</p>
                          {isSelf && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5 leading-none">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><RoleBadge role={u.role} /></TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'success' : 'destructive'}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{dateBR(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => setViewUser(u)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {!isSelf && (
                        <Button
                          variant="ghost" size="icon"
                          title={u.active ? 'Desativar acesso' : 'Reativar acesso'}
                          disabled={togglingId === u.id}
                          onClick={() => handleToggleActive(u)}
                        >
                          {togglingId === u.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : u.active ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
                        </Button>
                      )}
                      {!isSelf && (
                        <Button
                          variant="ghost" size="icon"
                          title="Excluir usuário"
                          disabled={deletingId === u.id}
                          onClick={() => handleDelete(u)}
                        >
                          {deletingId === u.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4 text-destructive" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <EmptyState
                icon={Users}
                title={hasFilters ? 'Nenhum resultado' : 'Nenhum usuário'}
                description={hasFilters ? 'Ajuste os filtros' : "Clique em 'Novo usuário' para adicionar"}
                colSpan={5}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Form Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!saving) setDialogOpen(v); }}>
        <DialogContent className="max-w-md p-0 gap-0">
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">
                {editing ? 'Editar usuário' : 'Novo usuário'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editing ? 'Atualize dados, perfil ou status' : 'Configure o acesso ao sistema'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

            {/* Dados básicos */}
            <Section icon={Users} label="Dados do usuário">
              <div className="space-y-1.5">
                <Label>Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome do usuário"
                  className={cn(formErrors.name && 'border-destructive')}
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>E-mail <span className="text-destructive">*</span></Label>
                <Input
                  type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@empresa.com"
                  className={cn(formErrors.email && 'border-destructive')}
                />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>
            </Section>

            {/* Perfil */}
            <Section icon={ShieldCheck} label="Perfil de acesso">
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(ROLES).map(([key, cfg]) => (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, role: key }))}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                      form.role === key
                        ? `border-primary bg-primary/5 ring-1 ring-primary`
                        : 'border-input bg-background hover:border-muted-foreground/40',
                    )}
                  >
                    <div className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                      form.role === key ? cfg.bg : 'bg-muted',
                    )}>
                      <cfg.Icon className={cn('w-4 h-4', form.role === key ? cfg.color : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {ROLE_PERMISSIONS[key]?.label}
                      </p>
                    </div>
                    {form.role === key && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
            </Section>

            {/* Senha */}
            <Section icon={Lock} label={editing ? 'Alterar senha (opcional)' : 'Senha de acesso'}>
              <div className="space-y-1.5">
                <Label>{editing ? 'Nova senha' : 'Senha'} {!editing && <span className="text-destructive">*</span>}</Label>
                <PasswordInput
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? 'Deixe vazio para manter a atual' : 'Mínimo 8 caracteres'}
                  required={!editing}
                />
                {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
              </div>
              {form.password && (
                <div className="space-y-1.5">
                  <Label>Confirmar senha <span className="text-destructive">*</span></Label>
                  <PasswordInput
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repita a senha"
                    required={!!form.password}
                  />
                  {formErrors.confirmPassword && <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>}
                </div>
              )}
            </Section>

            {/* Status (edit only) */}
            {editing && (
              <Section icon={BarChart3} label="Status do usuário">
                <div className="flex gap-2">
                  {[true, false].map(v => (
                    <button key={String(v)} type="button"
                      onClick={() => setForm(f => ({ ...f, active: v }))}
                      className={cn(
                        'flex-1 h-9 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                        form.active === v
                          ? v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-destructive text-destructive-foreground border-destructive'
                          : 'bg-background border-input text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {v ? <><UserCheck className="w-3.5 h-3.5" /> Ativo</> : <><UserX className="w-3.5 h-3.5" /> Inativo</>}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Salvando...</>
                  : editing ? 'Salvar alterações' : 'Criar usuário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ── */}
      {viewUser && (
        <Dialog open={!!viewUser} onOpenChange={v => !v && setViewUser(null)}>
          <DialogContent className="max-w-md p-0 gap-0">

            {/* Header */}
            <div className="flex items-center gap-4 px-6 pt-6 pb-5 border-b border-border">
              <div className={cn(
                'h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0',
                viewUser.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              )}>
                {viewUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold leading-tight">{viewUser.name}</h2>
                  {currentUser?.id === viewUser.id && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5 leading-none">Você</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{viewUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <RoleBadge role={viewUser.role} />
                  <Badge variant={viewUser.active ? 'success' : 'destructive'}>
                    {viewUser.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Informações */}
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Cadastrado em</p>
                  <p className="font-medium">{dateBR(viewUser.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">ID do usuário</p>
                  <p className="font-mono text-xs text-muted-foreground truncate">{viewUser.id.slice(0, 12)}…</p>
                </div>
              </div>

              {/* Permissões do perfil */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Permissões do perfil
                </p>
                <div className="rounded-xl border border-border overflow-hidden">
                  {ALL_MODULES.map(mod => {
                    const perms = ROLE_PERMISSIONS[viewUser.role];
                    const canAccess = perms?.modules?.includes(mod) ?? false;
                    const isUserMod = mod === 'Usuários';
                    return (
                      <div key={mod} className={cn(
                        'flex items-center justify-between px-4 py-2.5 text-sm border-b last:border-0',
                        !canAccess && 'opacity-40',
                      )}>
                        <span className="font-medium">{mod}</span>
                        {canAccess
                          ? <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Acesso</span>
                          : <span className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Sem acesso</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setViewUser(null)}>Fechar</Button>
              <Button onClick={() => { setViewUser(null); openEdit(viewUser); }}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
              </Button>
            </div>

          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
