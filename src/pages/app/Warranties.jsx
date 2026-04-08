import { useEffect, useState, useMemo, useCallback } from 'react';
import { useConfirm } from '@/components/ConfirmModal';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, Shield, Printer, Search, X, Loader2,
  ChevronDown, User, Calendar, Link2, Package, Wrench, ClipboardList,
  AlertTriangle, Clock, CheckCircle2, BarChart3, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';
import { printWarranty } from '@/utils/print';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  active:  { label: 'Ativa',     variant: 'success' },
  expired: { label: 'Expirada',  variant: 'destructive' },
  claimed: { label: 'Utilizada', variant: 'warning' },
};
const STATUS_ORDER = ['active', 'claimed', 'expired'];

const DURATION_PRESETS = [
  { label: '30 dias', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 ano',   days: 365 },
];

const emptyForm = {
  clientId: '', serviceOrderId: '', status: 'active',
  startDate: '', endDate: '', description: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────────────────
const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const dateBR = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const todayISO = () => new Date().toISOString().substring(0, 10);
function addDays(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().substring(0, 10);
}
function daysUntil(endDate) {
  if (!endDate) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(0, 0, 0, 0);
  return Math.round((end - now) / 86400000);
}

// ── SearchSelect ──────────────────────────────────────────────────────────────────────────
function SearchSelect({ value, onChange, options, placeholder = 'Selecione...', disabled = false, className }) {
  const normalizedValue = value === '' ? '__empty__' : value;

  return (
    <div className={className}>
      <Select
        value={normalizedValue || undefined}
        onValueChange={(v) => onChange(v === '__empty__' ? '' : v)}
        disabled={disabled}
      >
        <SelectTrigger className="overflow-hidden [&>span]:block [&>span]:truncate [&>span]:whitespace-nowrap">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => {
            const optionValue = o.value === '' ? '__empty__' : o.value;
            const optionText = o.warn
              ? `${o.label} - ${o.warn}`
              : (o.sub ? `${o.label} - ${o.sub}` : o.label);
            return (
              <SelectItem key={optionValue} value={optionValue}>{optionText}</SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────────────────────────────────
function Section({ icon: Icon, label, children, right }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
        <div className="flex-1 h-px bg-border" />
        {right}
      </div>
      {children}
    </div>
  );
}

// ── DaysRemaining indicator ───────────────────────────────────────────────────────────────
function DaysRemaining({ endDate, status }) {
  if (status === 'claimed') return <span className="text-xs text-muted-foreground">Utilizada</span>;
  const days = daysUntil(endDate);
  if (days === null) return null;
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600">
      <Clock className="w-3 h-3" /> Expirada
    </span>
  );
  if (days === 0) return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
      <AlertTriangle className="w-3 h-3" /> Vence hoje
    </span>
  );
  if (days <= 30) return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Clock className="w-3 h-3" /> {days}d restantes
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <CheckCircle2 className="w-3 h-3" /> {days}d restantes
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────────────────
export default function Warranties() {
  const [confirmModal, confirm] = useConfirm();
  const { tenant } = useTenant();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [warranties, setWarranties] = useState([]);
  const [clients, setClients] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [viewWarranty, setViewWarranty] = useState(null);

  const load = async () => {
    try {
      const [w, c, o] = await Promise.all([
        api.get('/warranties'),
        api.get('/clients'),
        api.get('/service-orders').catch(() => ({ data: { data: [] } })),
      ]);
      setWarranties(w.data.data || []);
      setClients(c.data.data || []);
      setAllOrders(o.data.data || []);
    } catch { toast.error('Erro ao carregar'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ── Client's orders (filtered in memory) ──
  const clientOrders = useMemo(
    () => allOrders.filter(o => o.clientId === form.clientId),
    [allOrders, form.clientId]
  );

  // ── Source options: full OS + each service + each item per client ──
  const sourceOptions = useMemo(() => {
    if (!form.clientId || clientOrders.length === 0) return [];
    const opts = [];

    clientOrders.forEach(o => {
      const date = o.completedAt || o.createdAt;
      const osIdShort = o.id.slice(0, 8);

      const hasWarrantyOS = warranties.some(w =>
        w.serviceOrderId === o.id && (!editing || w.id !== editing.id)
      );
      opts.push({
        value: `os-${o.id}`,
        label: o.description || `OS #${osIdShort}`,
        sub: `OS #${osIdShort} · ${dateBR(date)} · ${fmt(o.total)}`,
        Icon: ClipboardList,
        iconCls: 'text-violet-500',
        _osId: o.id, _type: 'os',
        _name: o.description || `OS #${osIdShort}`,
        _date: date,
        warn: hasWarrantyOS ? 'Esta OS já possui garantia cadastrada' : undefined,
      });

      (o.services || []).forEach(s => {
        const sName = s.service?.name || 'Serviço';
        const hasWarn = warranties.some(w =>
          w.serviceOrderId === o.id && w.description === sName && (!editing || w.id !== editing.id)
        );
        opts.push({
          value: `svc-${o.id}-${s.serviceId}`,
          label: sName,
          sub: `Serviço · OS #${osIdShort} · ${dateBR(date)} · ${fmt(s.unitPrice)}`,
          Icon: Wrench, iconCls: 'text-blue-500',
          _osId: o.id, _type: 'service', _name: sName, _date: date,
          warn: hasWarn ? 'Já possui garantia cadastrada' : undefined,
        });
      });

      (o.items || []).forEach(i => {
        const iName = i.item?.name || 'Produto';
        const hasWarn = warranties.some(w =>
          w.serviceOrderId === o.id && w.description === iName && (!editing || w.id !== editing.id)
        );
        opts.push({
          value: `itm-${o.id}-${i.itemId}`,
          label: iName,
          sub: `Peça/Produto · OS #${osIdShort} · ${dateBR(date)} · ${i.quantity}x ${fmt(i.unitPrice)}`,
          Icon: Package, iconCls: 'text-amber-500',
          _osId: o.id, _type: 'item', _name: iName, _date: date,
          warn: hasWarn ? 'Já possui garantia cadastrada' : undefined,
        });
      });
    });

    return opts;
  }, [clientOrders, warranties, form.clientId, editing]);

  // ── Auto-fill on source select ──
  const handleSourceSelect = useCallback((sourceId) => {
    setSelectedSourceId(sourceId);
    if (!sourceId) return;
    const opt = sourceOptions.find(o => o.value === sourceId);
    if (!opt) return;
    const startDate = opt._date ? opt._date.substring(0, 10) : todayISO();
    setForm(f => ({
      ...f,
      serviceOrderId: opt._osId,
      description: opt._name,
      startDate,
      endDate: addDays(startDate, 90),
    }));
  }, [sourceOptions]);

  const handleDurationPreset = (days) => {
    if (!form.startDate) return;
    setForm(f => ({ ...f, endDate: addDays(f.startDate, days) }));
  };

  const currentDuration = useMemo(() => {
    if (!form.startDate || !form.endDate) return null;
    const days = Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000);
    if (days <= 0) return null;
    if (days === 365) return '1 ano';
    if (days % 365 === 0) return `${days / 365} anos`;
    if (days === 180) return '6 meses';
    if (days === 90) return '3 meses';
    if (days === 30) return '30 dias';
    return `${days} dias`;
  }, [form.startDate, form.endDate]);

  const openNew = () => {
    setEditing(null); setForm(emptyForm);
    setSelectedSourceId(''); setManualMode(false);
    setDialogOpen(true);
  };

  const openView = (w) => setViewWarranty(w);

  const openEdit = (w) => {
    setEditing(w);
    setForm({
      clientId: w.clientId,
      serviceOrderId: w.serviceOrderId || '',
      status: w.status,
      startDate: w.startDate?.substring(0, 10) || '',
      endDate: w.endDate?.substring(0, 10) || '',
      description: w.description || '',
    });
    setManualMode(!w.serviceOrderId);
    setSelectedSourceId(w.serviceOrderId ? `os-${w.serviceOrderId}` : '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Selecione o cliente'); return; }
    if (!form.description.trim()) { toast.error('Informe a descrição da garantia'); return; }
    if (!form.startDate || !form.endDate) { toast.error('Informe o período da garantia'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('Data de fim deve ser posterior ao início'); return;
    }
    if (editing) {
      const changed = [];
      if (editing.startDate?.substring(0, 10) !== form.startDate) changed.push('período de início');
      if (editing.endDate?.substring(0, 10) !== form.endDate) changed.push('período de fim');
      if (editing.status !== form.status) changed.push('status');
      if ((editing.serviceOrderId || '') !== form.serviceOrderId) changed.push('origem');
      if ((editing.description || '') !== form.description.trim()) changed.push('descrição');
      const ok = await confirm({
        title: 'Salvar alterações na garantia?',
        description: changed.length > 0
          ? `Campos alterados: ${changed.join(', ')}. As alterações serão aplicadas imediatamente.`
          : 'Os dados da garantia serão atualizados.',
        item: [editing.client?.name, editing.description].filter(Boolean).join(' · ') || 'esta garantia',
        confirmLabel: 'Salvar alterações',
        variant: 'default',
      });
      if (!ok) return;
    }

    const data = {
      clientId: form.clientId,
      serviceOrderId: form.serviceOrderId || null,
      status: form.status,
      startDate: new Date(form.startDate + 'T00:00:00').toISOString(),
      endDate: new Date(form.endDate + 'T23:59:59').toISOString(),
      description: form.description.trim(),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/warranties/${editing.id}`, data);
        toast.success('Garantia atualizada', { description: 'As alterações foram salvas com sucesso.' });
      } else {
        await api.post('/warranties', data);
        toast.success('Garantia emitida', { description: 'A garantia foi cadastrada com sucesso.' });
      }
      setDialogOpen(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar garantia');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, label, period) => {
    const ok = await confirm({
      title: 'Excluir garantia?',
      description: `Esta garantia será removida permanentemente e não poderá ser recuperada.${period ? ` Cobertura: ${period}.` : ''}`,
      item: label,
      confirmLabel: 'Excluir garantia',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await api.delete(`/warranties/${id}`);
      toast.success('Garantia excluída', { description: 'O registro foi removido permanentemente.' });
      load();
    }
    catch { toast.error('Erro ao remover garantia'); }
    finally { setDeletingId(null); }
  };

  const filtered = useMemo(() =>
    warranties.filter(w => {
      if (filterStatus !== 'all' && w.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const osShort = (w.serviceOrderId || '').slice(0, 8).toLowerCase();
        if (
          !(w.client?.name || '').toLowerCase().includes(q) &&
          !(w.description || '').toLowerCase().includes(q) &&
          !osShort.includes(q)
        ) return false;
      }
      return true;
    }),
    [warranties, filterStatus, search]
  );

  const kpi = useMemo(() => {
    const active = warranties.filter(w => w.status === 'active');
    return {
      total: warranties.length,
      active: active.length,
      expiringSoon: active.filter(w => { const d = daysUntil(w.endDate); return d !== null && d >= 0 && d <= 30; }).length,
      linked: warranties.filter(w => w.serviceOrderId).length,
    };
  }, [warranties]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      {confirmModal}
      <PageHeader
        title="Garantias"
        description={`${warranties.length} garantia${warranties.length !== 1 ? 's' : ''} registradas`}
      >
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Nova Garantia</Button>
      </PageHeader>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',           value: kpi.total,        Icon: Shield,       color: 'text-primary',    bg: 'bg-primary/5' },
          { label: 'Ativas',          value: kpi.active,       Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Vencem em 30d',   value: kpi.expiringSoon, Icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Vinculadas a OS', value: kpi.linked,       Icon: Link2,        color: 'text-violet-600', bg: 'bg-violet-50' },
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

      {/* Filter bar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, produto/serviço ou nº OS..."
            className="pl-9" value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button type="button" onClick={() => setFilterStatus('all')}
            className={cn('h-10 px-3 rounded-md border text-xs font-medium transition-colors',
              filterStatus === 'all' ? 'bg-foreground text-background border-foreground' : 'border-input bg-background text-muted-foreground hover:text-foreground'
            )}>
            Todas ({warranties.length})
          </button>
          {STATUS_ORDER.map(s => (
            <button key={s} type="button"
              onClick={() => setFilterStatus(fs => fs === s ? 'all' : s)}
              className={cn('h-10 px-3 rounded-md border text-xs font-medium transition-colors',
                filterStatus === s ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:text-foreground'
              )}>
              {STATUS_MAP[s].label} ({warranties.filter(w => w.status === s).length})
            </button>
          ))}
        </div>
        {(search || filterStatus !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterStatus('all'); }} className="gap-1 text-muted-foreground whitespace-nowrap">
            <X className="w-3.5 h-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <div className="flex items-center px-4 py-2.5 border-b border-border">
          <span className="text-xs text-muted-foreground">
            {filtered.length === warranties.length
              ? `${warranties.length} garantia${warranties.length !== 1 ? 's' : ''}`
              : `${filtered.length} de ${warranties.length}`}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto / Serviço</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(w => {
              const days = daysUntil(w.endDate);
              const expiringSoon = w.status === 'active' && days !== null && days >= 0 && days <= 30;
              const expired = w.status !== 'claimed' && days !== null && days < 0;
              return (
                <TableRow key={w.id} className={cn(expired && 'opacity-55', expiringSoon && 'bg-amber-50/40')}>
                  <TableCell className="font-medium">{w.client?.name || '—'}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex items-start gap-1.5">
                      {w.serviceOrderId
                        ? <ClipboardList className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                        : <Shield className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 mt-0.5" />}
                      <span className="text-sm truncate">{w.description || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {w.serviceOrderId
                      ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono text-violet-700 bg-violet-50 border border-violet-200">{w.serviceOrderId.slice(0, 8)}</span>
                      : <span className="text-xs text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {dateBR(w.startDate)} → {dateBR(w.endDate)}
                  </TableCell>
                  <TableCell>
                    <DaysRemaining endDate={w.endDate} status={w.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_MAP[w.status]?.variant || 'default'}>
                      {STATUS_MAP[w.status]?.label || w.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => openView(w)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Imprimir" onClick={() => printWarranty(w, tenant)}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(w)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={deletingId === w.id}
                        onClick={() => handleDelete(
                          w.id,
                          [w.client?.name, w.description].filter(Boolean).join(' · ') || 'Garantia',
                          `${dateBR(w.startDate)} – ${dateBR(w.endDate)}`,
                        )}>
                        {deletingId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <EmptyState
                icon={Shield}
                title={search || filterStatus !== 'all' ? 'Nenhum resultado' : 'Nenhuma garantia'}
                description={search || filterStatus !== 'all' ? 'Ajuste os filtros' : "Clique em 'Nova Garantia' para cadastrar"}
                colSpan={7}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!saving) setDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col p-0 gap-0">

          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold leading-tight">
                {editing ? 'Editar Garantia' : 'Emitir Garantia'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editing
                  ? 'Atualize os dados da garantia'
                  : 'Vincule a garantia a um produto ou serviço realizado para o cliente'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* 1 — Cliente */}
              <Section icon={User} label="1. Cliente">
                <Select
                  value={form.clientId || undefined}
                  onValueChange={(v) => {
                    setForm({ ...emptyForm, status: 'active', clientId: v });
                    setSelectedSourceId('');
                    setManualMode(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Section>

              {/* 2 — Origem */}
              {form.clientId && (
                <Section icon={Link2} label="2. Origem da garantia"
                  right={
                    <button type="button"
                      onClick={() => { setManualMode(m => !m); setSelectedSourceId(''); }}
                      className="text-xs text-muted-foreground hover:text-foreground underline normal-case tracking-normal font-normal">
                      {manualMode ? '← Selecionar de OS' : 'Inserir manualmente'}
                    </button>
                  }
                >
                  {!manualMode ? (
                    clientOrders.length === 0 ? (
                      <div className="rounded-xl bg-muted/40 border border-border px-4 py-5 text-center">
                        <ClipboardList className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Este cliente não possui ordens de serviço.</p>
                        <button type="button" className="text-xs text-primary underline mt-1 hover:no-underline" onClick={() => setManualMode(true)}>
                          Inserir descrição manualmente
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <SearchSelect
                          value={selectedSourceId}
                          onChange={handleSourceSelect}
                          options={sourceOptions}
                          placeholder="Buscar produto, serviço ou OS do cliente..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Selecione o produto ou serviço que originou a garantia. Os dados serão preenchidos automaticamente.
                        </p>
                        {selectedSourceId && form.serviceOrderId && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg">
                            <Link2 className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                            <span className="text-xs text-violet-700">
                              Vinculada à OS <strong className="font-mono">{form.serviceOrderId.slice(0, 8)}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="space-y-1.5">
                      <Label>Descrição da garantia <span className="text-destructive">*</span></Label>
                      <Input
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Ex: Tela, bateria, alinhamento, troca de óleo..."
                      />
                    </div>
                  )}
                </Section>
              )}

              {/* Description editable after source selection */}
              {form.clientId && selectedSourceId && !manualMode && (
                <Section icon={ClipboardList} label="3. Descrição">
                  <Input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descrição da cobertura"
                  />
                  <p className="text-xs text-muted-foreground">Preenchida automaticamente. Ajuste se necessário.</p>
                </Section>
              )}

              {/* Period */}
              {form.clientId && (form.description || manualMode || selectedSourceId) && (
                <Section
                  icon={Calendar}
                  label={`${manualMode || !selectedSourceId ? '3' : '4'}. Período de cobertura`}
                  right={currentDuration && (
                    <span className="text-xs font-semibold text-primary normal-case tracking-normal">{currentDuration}</span>
                  )}
                >
                  {form.startDate && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">Atalhos:</span>
                      {DURATION_PRESETS.map(p => (
                        <button key={p.days} type="button"
                          onClick={() => handleDurationPreset(p.days)}
                          className={cn(
                            'h-7 px-2.5 rounded-full border text-xs font-medium transition-colors',
                            form.endDate === addDays(form.startDate, p.days)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-input bg-background text-muted-foreground hover:text-foreground',
                          )}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Data de início <span className="text-destructive">*</span></Label>
                      <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Data de fim <span className="text-destructive">*</span></Label>
                      <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
                    </div>
                  </div>
                  {form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate) && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> A data de fim deve ser após o início
                    </p>
                  )}
                </Section>
              )}

              {/* Status */}
              {form.clientId && (
                <Section icon={BarChart3} label={`${manualMode || !selectedSourceId ? '4' : '5'}. Status`}>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_ORDER.map(s => (
                      <button key={s} type="button"
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={cn(
                          'h-8 px-3 rounded-full border text-xs font-medium transition-all',
                          form.status === s
                            ? s === 'active' ? 'bg-emerald-600 text-white border-emerald-600'
                              : s === 'expired' ? 'bg-destructive text-destructive-foreground border-destructive'
                              : 'bg-amber-500 text-white border-amber-500'
                            : 'border-input bg-background text-muted-foreground hover:text-foreground',
                        )}>
                        {STATUS_MAP[s].label}
                      </button>
                    ))}
                  </div>
                </Section>
              )}

            </div>

            <div className="flex gap-2 justify-end px-6 py-4 border-t border-border flex-shrink-0">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Salvando...</>
                  : editing ? 'Salvar alterações' : 'Emitir garantia'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewWarranty && (
        <Dialog open={!!viewWarranty} onOpenChange={v => !v && setViewWarranty(null)}>
          <DialogContent className="max-w-md p-0 gap-0">

            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold leading-tight">Detalhes da Garantia</h2>
                <div className="mt-1">
                  <Badge variant={STATUS_MAP[viewWarranty.status]?.variant || 'default'}>
                    {STATUS_MAP[viewWarranty.status]?.label || viewWarranty.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">

              {/* Cliente */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Cliente</p>
                  <p className="text-sm font-medium">{viewWarranty.client?.name || '—'}</p>
                </div>
              </div>

              {/* Produto / Serviço */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Produto / Serviço</p>
                  <p className="text-sm font-medium">{viewWarranty.description || '—'}</p>
                </div>
              </div>

              {/* OS Vinculada */}
              {viewWarranty.serviceOrderId && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Link2 className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">OS Vinculada</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-violet-700 bg-violet-50 border border-violet-200">
                      #{viewWarranty.serviceOrderId.slice(0, 8)}
                    </span>
                  </div>
                </div>
              )}

              {/* Período */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Período de cobertura</p>
                  <p className="text-sm font-medium">{dateBR(viewWarranty.startDate)} → {dateBR(viewWarranty.endDate)}</p>
                </div>
              </div>

              {/* Prazo */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Prazo restante</p>
                  <div className="mt-0.5">
                    <DaysRemaining endDate={viewWarranty.endDate} status={viewWarranty.status} />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => printWarranty(viewWarranty, tenant)} className="gap-1.5 text-muted-foreground">
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewWarranty(null)}>Fechar</Button>
                <Button onClick={() => { setViewWarranty(null); openEdit(viewWarranty); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                </Button>
              </div>
            </div>

          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
