import { useEffect, useState, useMemo } from 'react';
import { useConfirm } from '@/components/ConfirmModal';
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, FileText,
  Wrench, ShoppingCart, Search, X, Loader2,
  Tag, BarChart3, ArrowUpRight, ArrowDownRight, ClipboardList, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSensitiveValues } from '@/lib/sensitiveValues';

// ── Constants ─────────────────────────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week',  label: 'Esta semana' },
  { key: 'month', label: 'Este mês' },
  { key: 'year',  label: 'Este ano' },
  { key: 'all',   label: 'Tudo' },
  { key: 'custom',label: 'Período' },
];

const emptyForm = {
  type: 'revenue', category: '', description: '', date: new Date().toISOString().split('T')[0],
};

// ── Helpers ────────────────────────────────────────────────────────────────────────────────
const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtShort = (v) => {
  const n = v || 0;
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}k`;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
};
const dateBR = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' && d.length === 10 ? d + 'T12:00:00' : d;
  return new Date(s).toLocaleDateString('pt-BR');
};

function getPeriodRange(period) {
  const now = new Date();
  const iso = (d) => d.toISOString().substring(0, 10);
  switch (period) {
    case 'today': { const t = iso(now); return { from: t, to: t }; }
    case 'week': {
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: iso(mon), to: iso(sun) };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: iso(from), to: iso(to) };
    }
    case 'year': return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
    default: return null;
  }
}

function maskMoney(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function parseMoney(masked) {
  return parseFloat(String(masked).replace(/\./g, '').replace(',', '.')) || 0;
}

function pctChange(curr, prev) {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

// ── CategoryBar ───────────────────────────────────────────────────────────────────────
function CategoryBar({ label, total, maxVal, formatValue = fmtShort }) {
  const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium truncate max-w-[140px]" title={label}>{label}</span>
        <span className="text-muted-foreground ml-2 shrink-0">{formatValue(total)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Section divider ──────────────────────────────────────────────────────────────────────
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

// ── MoneyInput ────────────────────────────────────────────────────────────────────────
function MoneyInput({ value, onChange, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">R$</span>
      <Input
        {...props}
        value={value}
        onChange={e => onChange(maskMoney(e.target.value))}
        className="pl-9"
        inputMode="numeric"
        placeholder="0,00"
      />
    </div>
  );
}

// ── Chart tooltip ───────────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter = fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium ml-auto pl-3">{formatter(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, iconBg, iconColor, valueColor, pct, periodLabel, prominent }) {
  return (
    <div className={cn(
      'rounded-xl p-5 border',
      prominent
        ? (valueColor === 'text-primary-foreground' ? 'bg-primary border-primary' : 'bg-card border-destructive/30')
        : 'bg-card border-border',
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className={cn('text-xs font-semibold uppercase tracking-widest leading-none', prominent && valueColor === 'text-primary-foreground' ? 'text-primary-foreground/60' : 'text-muted-foreground/70')}>
          {label}
        </p>
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>
      <p className={cn('text-2xl font-black', valueColor)}>{value}</p>
      {pct !== null && pct !== undefined && (
        <p className={cn(
          'text-xs mt-1.5 flex items-center gap-1',
          prominent && valueColor === 'text-primary-foreground'
            ? 'text-primary-foreground/70'
            : pct >= 0 ? 'text-emerald-600' : 'text-red-500'
        )}>
          {pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(pct).toFixed(1)}% vs período anterior
        </p>
      )}
      <p className={cn('text-xs mt-1', prominent && valueColor === 'text-primary-foreground' ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
        {periodLabel}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────────────
export default function Financial() {
  const [confirmModal, confirm] = useConfirm();
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const { isVisible: isValuesVisible, toggleVisibility: toggleValuesVisibility } = useSensitiveValues(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [moneyInput, setMoneyInput] = useState('');
  const [detailDialog, setDetailDialog] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // period & filters
  const [activePeriod, setActivePeriod]   = useState('month');
  const [customFrom, setCustomFrom]       = useState('');
  const [customTo, setCustomTo]           = useState('');
  const [search, setSearch]               = useState('');
  const [filterType, setFilterType]       = useState('all');
  const [filterCategory, setFilterCategory] = useState('');

  const load = async () => {
    try {
      const r = await api.get('/financial');
      setRecords(r.data.data || []);
    } catch { toast.error('Erro ao carregar registros financeiros'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ── Period range ──
  const periodRange = useMemo(() => {
    if (activePeriod === 'custom') return customFrom && customTo ? { from: customFrom, to: customTo } : null;
    if (activePeriod === 'all') return null;
    return getPeriodRange(activePeriod);
  }, [activePeriod, customFrom, customTo]);

  // records matching just the period (for KPIs + charts)
  const periodRecords = useMemo(() => {
    if (!periodRange) return records;
    return records.filter(r => {
      const d = r.date?.substring(0, 10);
      return d >= periodRange.from && d <= periodRange.to;
    });
  }, [records, periodRange]);

  // records matching all active filters (shown in table)
  const filtered = useMemo(() =>
    periodRecords.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterCategory && (r.category || '') !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(r.description || '').toLowerCase().includes(q) &&
          !(r.category || '').toLowerCase().includes(q) &&
          !(r.serviceOrder?.client?.name || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    }),
    [periodRecords, filterType, filterCategory, search]
  );

  // KPIs from period
  const kpi = useMemo(() => {
    const revenue  = periodRecords.filter(r => r.type === 'revenue').reduce((s, r) => s + r.value, 0);
    const expense  = periodRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.value, 0);
    const osLinked = periodRecords.filter(r => r.serviceOrderId).length;
    const cats     = new Set(periodRecords.map(r => r.category).filter(Boolean)).size;
    return { revenue, expense, profit: revenue - expense, total: periodRecords.length, osLinked, cats };
  }, [periodRecords]);

  // previous period for comparison
  const prevKpi = useMemo(() => {
    if (!periodRange || activePeriod === 'all' || activePeriod === 'custom') return null;
    const diffMs = new Date(periodRange.to + 'T23:59:59') - new Date(periodRange.from + 'T00:00:00');
    const prevTo   = new Date(new Date(periodRange.from + 'T00:00:00') - 1);
    const prevFrom = new Date(prevTo.getTime() - diffMs);
    const isoD = (d) => d.toISOString().substring(0, 10);
    const prevRecs = records.filter(r => {
      const d = r.date?.substring(0, 10);
      return d >= isoD(prevFrom) && d <= isoD(prevTo);
    });
    const revenue = prevRecs.filter(r => r.type === 'revenue').reduce((s, r) => s + r.value, 0);
    const expense = prevRecs.filter(r => r.type === 'expense').reduce((s, r) => s + r.value, 0);
    return { revenue, expense, profit: revenue - expense };
  }, [records, periodRange, activePeriod]);

  // monthly bar chart data (last 6 months, always from all records)
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        name: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
        ym, revenue: 0, expense: 0,
      });
    }
    records.forEach(r => {
      const ym = r.date?.substring(0, 7);
      const m = months.find(m => m.ym === ym);
      if (!m) return;
      if (r.type === 'revenue') m.revenue += r.value;
      else m.expense += r.value;
    });
    return months;
  }, [records]);

  // category breakdown (from period records)
  const categoryBreakdown = useMemo(() => {
    const map = {};
    periodRecords.forEach(r => {
      const key = r.category || 'Sem categoria';
      if (!map[key]) map[key] = 0;
      map[key] += r.value;
    });
    return Object.entries(map)
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [periodRecords]);

  const maxCatTotal = useMemo(() => categoryBreakdown.reduce((m, c) => Math.max(m, c.total), 0), [categoryBreakdown]);

  const allCategories = useMemo(
    () => [...new Set(records.map(r => r.category).filter(Boolean))].sort(),
    [records]
  );

  const hasActiveFilters = !!(search || filterType !== 'all' || filterCategory);

  const periodLabel = PERIOD_OPTIONS.find(p => p.key === activePeriod)?.label || '';

  const hiddenMoneyLabel = 'R$ *****';
  const formatMoney = (value) => (isValuesVisible ? fmt(value) : hiddenMoneyLabel);
  const formatShortMoney = (value) => (isValuesVisible ? fmtShort(value) : hiddenMoneyLabel);
  const formatSignedMoney = (type, value) => (isValuesVisible ? `${type === 'expense' ? '−' : '+'}${fmt(value)}` : '*****');

  const openNew = (defaultType = 'revenue') => {
    setEditing(null);
    setForm({ ...emptyForm, type: defaultType });
    setMoneyInput('');
    setDialogOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      type: r.type, category: r.category || '',
      description: r.description || '', date: r.date?.substring(0, 10) || '',
    });
    setMoneyInput(r.value ? maskMoney(String(Math.round(r.value * 100))) : '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = parseMoney(moneyInput);
    if (!value || value <= 0) { toast.error('Informe um valor válido'); return; }
    if (!form.date) { toast.error('Informe a data'); return; }
    const data = {
      type: form.type,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      value,
      date: new Date(form.date + 'T12:00:00').toISOString(),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/financial/${editing.id}`, data);
        toast.success('Lançamento atualizado', { description: 'As alterações foram salvas.' });
      } else {
        await api.post('/financial', data);
        toast.success(form.type === 'revenue' ? 'Receita lançada' : 'Despesa lançada', {
          description: `${fmt(value)} adicionado ao financeiro.`,
        });
      }
      setDialogOpen(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Não foi possível salvar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, description) => {
    const ok = await confirm({
      title: 'Excluir lançamento?',
      description: 'Este lançamento será removido permanentemente do financeiro e não poderá ser recuperado.',
      item: description,
      confirmLabel: 'Excluir lançamento',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await api.delete(`/financial/${id}`);
      toast.success('Lançamento excluído', { description: 'O registro foi removido.' });
      load();
    } catch { toast.error('Erro ao remover lançamento'); }
    finally { setDeletingId(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      {confirmModal}

      <PageHeader title="Financeiro" description="Gestão de receitas, despesas e fluxo de caixa">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleValuesVisibility}
            aria-label={isValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
            title={isValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {isValuesVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="outline" onClick={() => openNew('expense')}
            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">
            <TrendingDown className="w-4 h-4" /> Nova despesa
          </Button>
          <Button onClick={() => openNew('revenue')} className="gap-1.5">
            <TrendingUp className="w-4 h-4" /> Nova receita
          </Button>
        </div>
      </PageHeader>

      {/* ── Period selector ── */}
      <div className="mb-5 flex items-center gap-1.5 flex-wrap">
        {PERIOD_OPTIONS.map(p => (
          <button key={p.key} type="button"
            onClick={() => setActivePeriod(p.key)}
            className={cn(
              'h-8 px-3 rounded-full border text-xs font-medium transition-colors',
              activePeriod === p.key
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background border-input text-muted-foreground hover:text-foreground',
            )}>
            {p.label}
          </button>
        ))}
        {activePeriod === 'custom' && (
          <div className="flex items-center gap-1.5 ml-1">
            <Input type="date" className="h-8 w-[130px] text-xs px-2" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-muted-foreground text-xs">até</span>
            <Input type="date" className="h-8 w-[130px] text-xs px-2" value={customTo}   onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
        {periodRange && activePeriod !== 'custom' && (
          <span className="text-xs text-muted-foreground ml-1">
            {dateBR(periodRange.from)}{periodRange.from !== periodRange.to ? ` – ${dateBR(periodRange.to)}` : ''}
          </span>
        )}
      </div>

      {/* ── Main KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <KpiCard
          label="Receitas" value={formatMoney(kpi.revenue)}
          icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600"
          valueColor="text-emerald-600"
          pct={prevKpi ? pctChange(kpi.revenue, prevKpi.revenue) : undefined}
          periodLabel={periodLabel}
        />
        <KpiCard
          label="Despesas" value={formatMoney(kpi.expense)}
          icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-600"
          valueColor="text-red-600"
          pct={prevKpi ? pctChange(kpi.expense, prevKpi.expense) : undefined}
          periodLabel={periodLabel}
        />
        <KpiCard
          label="Lucro líquido" value={formatMoney(kpi.profit)}
          icon={DollarSign}
          iconBg={kpi.profit >= 0 ? 'bg-white/20' : 'bg-muted'}
          iconColor={kpi.profit >= 0 ? 'text-primary-foreground' : 'text-muted-foreground'}
          valueColor={kpi.profit >= 0 ? 'text-primary-foreground' : 'text-destructive'}
          pct={prevKpi ? pctChange(kpi.profit, prevKpi.profit) : undefined}
          periodLabel={periodLabel}
          prominent
        />
      </div>

      {/* ── Secondary KPI strip ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Lançamentos', value: kpi.total,    Icon: BarChart3,    color: 'text-primary' },
          { label: 'Com OS',          value: kpi.osLinked,Icon: ClipboardList, color: 'text-violet-500' },
          { label: 'Categorias',      value: kpi.cats,    Icon: Tag,           color: 'text-amber-500' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <k.Icon className={`w-4 h-4 flex-shrink-0 ${k.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-base font-bold leading-tight">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Analytics row (only when we have records) ── */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">

          {/* Monthly bar chart */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold mb-0.5">Evolução mensal</p>
            <p className="text-xs text-muted-foreground mb-4">Últimos 6 meses · receitas e despesas</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthlyData} barGap={3} barSize={10}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<ChartTooltip formatter={formatMoney} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                <Bar dataKey="revenue" name="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 flex-shrink-0" /> Receitas
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm bg-red-500 flex-shrink-0" /> Despesas
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold mb-0.5">Por categoria</p>
            <p className="text-xs text-muted-foreground mb-4">{periodLabel} · volume total</p>
            {categoryBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-24">
                <p className="text-xs text-muted-foreground">Sem dados no período selecionado</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {categoryBreakdown.map(c => (
                  <CategoryBar key={c.cat} label={c.cat} total={c.total} maxVal={maxCatTotal} formatValue={formatShortMoney} />
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição, categoria ou cliente..."
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
          {['all', 'revenue', 'expense'].map(t => (
            <button key={t} type="button"
              onClick={() => setFilterType(t)}
              className={cn(
                'h-10 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap',
                filterType === t
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background border-input text-muted-foreground hover:text-foreground',
              )}>
              {t === 'all' ? 'Todos' : t === 'revenue' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
        {allCategories.length > 0 && (
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
            value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm"
            onClick={() => { setSearch(''); setFilterType('all'); setFilterCategory(''); }}
            className="gap-1 text-muted-foreground whitespace-nowrap">
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <div className="flex items-center px-4 py-2.5 border-b border-border">
          <span className="text-xs text-muted-foreground">
            {filtered.length === periodRecords.length
              ? `${periodRecords.length} lançamento${periodRecords.length !== 1 ? 's' : ''}`
              : `${filtered.length} de ${periodRecords.length}`}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  <Badge variant={r.type === 'revenue' ? 'success' : 'destructive'}>
                    {r.type === 'revenue' ? 'Receita' : 'Despesa'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.category
                    ? <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 bg-muted rounded-full">{r.category}</span>
                    : <span className="text-xs text-muted-foreground/40">—</span>}
                </TableCell>
                <TableCell className="max-w-[220px]">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm">{r.description || '—'}</span>
                    {r.serviceOrderId && (
                      <button
                        onClick={() => setDetailDialog(r)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs text-violet-600 font-medium border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-md px-1.5 py-0.5 transition-colors"
                      >
                        <FileText className="w-3 h-3" /> OS
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn('font-semibold tabular-nums', r.type === 'revenue' ? 'text-emerald-600' : 'text-red-600')}>
                    {formatSignedMoney(r.type, r.value)}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{dateBR(r.date)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={deletingId === r.id}
                      onClick={() => handleDelete(r.id, [r.description, r.category].filter(Boolean).join(' · ') || 'Lançamento')}>
                      {deletingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <EmptyState
                icon={DollarSign}
                title={hasActiveFilters || activePeriod !== 'all' ? 'Nenhum resultado' : 'Nenhum lançamento'}
                description={hasActiveFilters || activePeriod !== 'all' ? 'Ajuste os filtros ou o período' : "Clique em 'Nova receita' para começar"}
                colSpan={6}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Form Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!saving) setDialogOpen(v); }}>
        <DialogContent className="max-w-md p-0 gap-0">
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border">
            <div className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
              form.type === 'revenue' ? 'bg-emerald-50' : 'bg-red-50',
            )}>
              {form.type === 'revenue'
                ? <TrendingUp className="w-5 h-5 text-emerald-600" />
                : <TrendingDown className="w-5 h-5 text-red-600" />}
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">
                {editing ? 'Editar lançamento' : 'Novo lançamento'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editing ? 'Atualize os dados do lançamento' : 'Registre uma receita ou despesa financeira'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

            {/* Tipo */}
            <Section icon={BarChart3} label="Tipo de lançamento">
              <div className="grid grid-cols-2 gap-2">
                {['revenue', 'expense'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={cn(
                      'h-10 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                      form.type === t
                        ? t === 'revenue'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-red-600 text-white border-red-600'
                        : 'bg-background border-input text-muted-foreground hover:text-foreground',
                    )}>
                    {t === 'revenue'
                      ? <><TrendingUp className="w-3.5 h-3.5" /> Receita</>
                      : <><TrendingDown className="w-3.5 h-3.5" /> Despesa</>}
                  </button>
                ))}
              </div>
            </Section>

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor <span className="text-destructive">*</span></Label>
                <MoneyInput value={moneyInput} onChange={setMoneyInput} />
              </div>
              <div className="space-y-1.5">
                <Label>Data <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Ex: Serviços, Materiais, Aluguel..."
                list="fin-category-list"
              />
              {allCategories.length > 0 && (
                <datalist id="fin-category-list">
                  {allCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descreva o lançamento..."
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Salvando...</>
                  : editing ? 'Salvar alterações' : 'Confirmar lançamento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── OS Detail Dialog ── */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Detalhes da OS vinculada
            </DialogTitle>
          </DialogHeader>
          {detailDialog?.serviceOrder && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Cliente</p>
                  <p className="font-medium">{detailDialog.serviceOrder.client?.name || '—'}</p>
                </div>
                {detailDialog.serviceOrder.vehicle && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Veículo</p>
                    <p className="font-medium">
                      {[detailDialog.serviceOrder.vehicle.brand, detailDialog.serviceOrder.vehicle.model].filter(Boolean).join(' ')}
                      {detailDialog.serviceOrder.vehicle.plate && ` — ${detailDialog.serviceOrder.vehicle.plate}`}
                    </p>
                  </div>
                )}
              </div>
              {detailDialog.serviceOrder.description && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Descrição</p>
                  <p>{detailDialog.serviceOrder.description}</p>
                </div>
              )}
              {detailDialog.serviceOrder.services?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Serviços realizados
                  </p>
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Serviço</th>
                          <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Qtd</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailDialog.serviceOrder.services.map(s => (
                          <tr key={s.id} className="border-t">
                            <td className="px-3 py-2 font-medium">{s.service?.name}</td>
                            <td className="px-2 py-2 text-center text-muted-foreground">{s.quantity}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatMoney(s.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {detailDialog.serviceOrder.items?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" /> Peças / Produtos utilizados
                  </p>
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Produto</th>
                          <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground">Qtd</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailDialog.serviceOrder.items.map(i => (
                          <tr key={i.id} className="border-t">
                            <td className="px-3 py-2 font-medium">{i.item?.name}</td>
                            <td className="px-2 py-2 text-center text-muted-foreground">{i.quantity}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatMoney(i.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="bg-muted/30 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor do lançamento</span>
                <span className="text-xl font-bold">{formatMoney(detailDialog.value)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
