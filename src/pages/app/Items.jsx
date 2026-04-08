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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, Search, Package, X, AlertTriangle, Loader2,
  DollarSign, Tag, Layers, Hash, FileText, ShoppingCart, Boxes,
  TrendingUp, ArrowUpDown, ArrowUp, ArrowDown,
  Filter, SlidersHorizontal, CircleOff, PackageX, TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────
const UNIT_OPTIONS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'pç', label: 'Peça (pç)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g',  label: 'Grama (g)' },
  { value: 'L',  label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'm',  label: 'Metro (m)' },
  { value: 'cm', label: 'Centímetro (cm)' },
  { value: 'par', label: 'Par' },
  { value: 'jg', label: 'Jogo (jg)' },
  { value: 'kt', label: 'Kit (kt)' },
];

const EMPTY_FORM = {
  name: '', description: '', sku: '',
  costPrice: '', sellPrice: '', stockQuantity: '',
  category: '', unit: 'un',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function maskMoney(raw) {
  // Keep only digits
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoney(masked) {
  if (!masked && masked !== 0) return 0;
  // "1.234,56" → 1234.56
  return parseFloat(String(masked).replace(/\./g, '').replace(',', '.')) || 0;
}

function formToMoney(val) {
  // val may be a number (from DB) or a masked string
  if (typeof val === 'number') return maskMoney(String(Math.round(val * 100)));
  return val;
}

// ── Section divider ───────────────────────────────────────────────────────────
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

// ── Category combobox ─────────────────────────────────────────────────────────
function CategoryCombobox({ value, onChange, existingCategories }) {
  const hasCustom = !!value && !existingCategories.includes(value);
  const selectValue = hasCustom ? '__custom__' : (value || '__none__');

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === '__none__') onChange('');
          else if (v === '__custom__') onChange('');
          else onChange(v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Ex.: Peças, Lubrificantes..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Sem categoria</SelectItem>
          {existingCategories.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
          <SelectItem value="__custom__">Outra categoria (digitar)</SelectItem>
        </SelectContent>
      </Select>

      {(selectValue === '__custom__' || hasCustom) && (
        <Input
          value={hasCustom ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite a categoria..."
        />
      )}
    </div>
  );
}

// ── MoneyInput ─────────────────────────────────────────────────────────────────
function MoneyInput({ value, onChange, icon: Icon, placeholder, error }) {
  const [display, setDisplay] = useState(() => formToMoney(value));

  useEffect(() => { setDisplay(formToMoney(value)); }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const masked = raw ? maskMoney(raw) : '';
    setDisplay(masked);
    onChange(masked);
  };

  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />}
      <Input
        value={display}
        onChange={handleChange}
        placeholder={placeholder || 'R$ 0,00'}
        inputMode="numeric"
        className={cn('pl-9', error && 'border-destructive focus-visible:ring-destructive')}
      />
    </div>
  );
}

// ── FieldError ─────────────────────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" />{msg}</p>;
}

// ── Margin badge ───────────────────────────────────────────────────────────────
function MarginBadge({ cost, sell }) {
  const c = parseMoney(cost);
  const s = parseMoney(sell);
  if (!c || !s || s <= c) return null;
  const margin = (((s - c) / s) * 100).toFixed(1);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">
      <TrendingUp className="w-3 h-3" /> {margin}% margem
    </span>
  );
}

// ── Sort config ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'name_asc',   label: 'Nome A→Z' },
  { value: 'name_desc',  label: 'Nome Z→A' },
  { value: 'stock_asc',  label: 'Menor estoque' },
  { value: 'stock_desc', label: 'Maior estoque' },
  { value: 'cost_asc',   label: 'Menor custo' },
  { value: 'cost_desc',  label: 'Maior custo' },
  { value: 'sell_asc',   label: 'Menor preço venda' },
  { value: 'sell_desc',  label: 'Maior preço venda' },
  { value: 'margin_desc',label: 'Maior margem' },
];

const STOCK_STATUS_OPTIONS = [
  { value: 'all',    label: 'Todos os status' },
  { value: 'ok',     label: 'Em estoque' },
  { value: 'low',    label: 'Estoque baixo (≤5)' },
  { value: 'zero',   label: 'Estoque zerado' },
  { value: 'nocat',  label: 'Sem categoria' },
];

function stockStatus(qty) {
  if (qty === 0) return 'zero';
  if (qty <= 5)  return 'low';
  return 'ok';
}

// ── StockBadge ────────────────────────────────────────────────────────────────
function StockBadge({ qty, unit }) {
  const s = stockStatus(qty);
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full',
      s === 'zero' && 'text-red-700 bg-red-50 border border-red-200',
      s === 'low'  && 'text-amber-700 bg-amber-50 border border-amber-200',
      s === 'ok'   && 'text-foreground',
    )}>
      {s === 'zero' && <PackageX className="w-3 h-3" />}
      {s === 'low'  && <TriangleAlert className="w-3 h-3" />}
      {qty}
      {unit && <span className="text-xs font-normal text-muted-foreground">{unit}</span>}
    </span>
  );
}

// ── SortHeader ────────────────────────────────────────────────────────────────
function SortHeader({ label, field, sort, onSort }) {
  const active = sort.startsWith(field);
  const asc = sort === `${field}_asc`;
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => onSort(active && asc ? `${field}_desc` : `${field}_asc`)}
    >
      {label}
      {active ? (asc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );
}

// ── ActiveFilterChip ──────────────────────────────────────────────────────────
function ActiveFilter({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-primary/70 ml-0.5"><X className="w-3 h-3" /></button>
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Items() {
  const [confirmModal, confirm] = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [sort, setSort] = useState('name_asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    api.get('/items')
      .then(r => setItems(r.data.data || []))
      .catch(() => toast.error('Erro ao carregar estoque'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (i) => {
    setEditing(i);
    setForm({
      name: i.name,
      description: i.description || '',
      sku: i.sku || '',
      costPrice: formToMoney(i.costPrice),
      sellPrice: formToMoney(i.sellPrice),
      stockQuantity: String(i.stockQuantity ?? ''),
      category: i.category || '',
      unit: i.unit || 'un',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'O nome do item é obrigatório.';
    const qty = form.stockQuantity === '' ? null : parseInt(form.stockQuantity, 10);
    if (form.stockQuantity !== '' && (isNaN(qty) || qty < 0)) e.stockQuantity = 'Informe uma quantidade válida (número inteiro ≥ 0).';
    const cost = parseMoney(form.costPrice);
    const sell = parseMoney(form.sellPrice);
    if (form.costPrice && cost < 0) e.costPrice = 'O custo não pode ser negativo.';
    if (form.sellPrice && sell < 0) e.sellPrice = 'O preço de venda não pode ser negativo.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const data = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      sku: form.sku.trim() || undefined,
      costPrice: parseMoney(form.costPrice),
      sellPrice: parseMoney(form.sellPrice),
      stockQuantity: form.stockQuantity === '' ? 0 : parseInt(form.stockQuantity, 10),
      category: form.category.trim() || undefined,
      unit: form.unit || undefined,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/items/${editing.id}`, data);
        toast.success('Item atualizado', { description: 'As alterações foram salvas.' });
      } else {
        await api.post('/items', data);
        toast.success('Item cadastrado', { description: 'O item foi adicionado ao estoque.' });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Não foi possível salvar o item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Excluir item',
      description: 'O item será removido permanentemente do estoque.',
      item: name,
      confirmLabel: 'Excluir item',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingId(id);
    try { await api.delete(`/items/${id}`); toast.success('Item removido'); load(); }
    catch { toast.error('Erro ao remover item'); }
    finally { setDeletingId(null); }
  };

  const margin = (i) => {
    const c = i.costPrice || 0;
    const s = i.sellPrice || 0;
    if (!c || !s || s <= c) return 0;
    return ((s - c) / s) * 100;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = items.filter(i => {
      // Category filter
      if (filterCategory !== 'all' && (i.category || '') !== filterCategory) return false;
      // Stock status filter
      if (filterStock === 'zero'  && i.stockQuantity !== 0) return false;
      if (filterStock === 'low'   && !(i.stockQuantity > 0 && i.stockQuantity <= 5)) return false;
      if (filterStock === 'ok'    && i.stockQuantity <= 5)  return false;
      if (filterStock === 'nocat' && (i.category || '').trim()) return false;
      // Search
      if (q) {
        const qd = q.replace(/\D/g, '');
        if (
          !i.name.toLowerCase().includes(q) &&
          !(i.category || '').toLowerCase().includes(q) &&
          !(i.description || '').toLowerCase().includes(q) &&
          !(i.sku || '').toLowerCase().includes(q) &&
          !(qd && (i.sku || '').replace(/\D/g, '').includes(qd))
        ) return false;
      }
      return true;
    });
    // Sort
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'name_asc':   return a.name.localeCompare(b.name, 'pt-BR');
        case 'name_desc':  return b.name.localeCompare(a.name, 'pt-BR');
        case 'stock_asc':  return a.stockQuantity - b.stockQuantity;
        case 'stock_desc': return b.stockQuantity - a.stockQuantity;
        case 'cost_asc':   return (a.costPrice||0) - (b.costPrice||0);
        case 'cost_desc':  return (b.costPrice||0) - (a.costPrice||0);
        case 'sell_asc':   return (a.sellPrice||0) - (b.sellPrice||0);
        case 'sell_desc':  return (b.sellPrice||0) - (a.sellPrice||0);
        case 'margin_desc':return margin(b) - margin(a);
        default: return 0;
      }
    });
    return list;
  }, [items, search, filterCategory, filterStock, sort]);

  const categories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR')), [items]);

  // KPI counts (always from full list)
  const kpi = useMemo(() => ({
    total:    items.length,
    zero:     items.filter(i => i.stockQuantity === 0).length,
    low:      items.filter(i => i.stockQuantity > 0 && i.stockQuantity <= 5).length,
    cats:     categories.length,
  }), [items, categories]);

  const activeFilters = [
    search        && { key:'search',   label: `"${search}"`,                    clear: () => setSearch('') },
    filterCategory !== 'all' && { key:'cat', label: filterCategory,             clear: () => setFilterCategory('all') },
    filterStock !== 'all'    && { key:'stock', label: STOCK_STATUS_OPTIONS.find(o=>o.value===filterStock)?.label, clear: () => setFilterStock('all') },
  ].filter(Boolean);
  const hasFilters = activeFilters.length > 0;
  const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const setF = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: undefined })); };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      {confirmModal}
      <PageHeader title="Estoque" description={`${items.length} iten${items.length !== 1 ? 's' : ''}`}>
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Novo Item</Button>
      </PageHeader>

      {/* ── KPI summary strip ── */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <button
            type="button"
            onClick={() => { setFilterStock('all'); setFilterCategory('all'); setSearch(''); }}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-accent',
              filterStock === 'all' && !search && filterCategory === 'all' ? 'border-primary/40 bg-primary/5' : 'bg-card',
            )}
          >
            <Boxes className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div><p className="text-lg font-bold leading-none">{kpi.total}</p><p className="text-xs text-muted-foreground mt-0.5">Total de itens</p></div>
          </button>
          <button
            type="button"
            onClick={() => setFilterStock(s => s === 'zero' ? 'all' : 'zero')}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-accent',
              kpi.zero > 0 ? 'border-red-200 bg-red-50/60' : 'bg-card',
              filterStock === 'zero' && 'ring-2 ring-red-400',
            )}
          >
            <PackageX className={cn('w-5 h-5 flex-shrink-0', kpi.zero > 0 ? 'text-red-500' : 'text-muted-foreground')} />
            <div><p className={cn('text-lg font-bold leading-none', kpi.zero > 0 && 'text-red-600')}>{kpi.zero}</p><p className="text-xs text-muted-foreground mt-0.5">Sem estoque</p></div>
          </button>
          <button
            type="button"
            onClick={() => setFilterStock(s => s === 'low' ? 'all' : 'low')}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-accent',
              kpi.low > 0 ? 'border-amber-200 bg-amber-50/60' : 'bg-card',
              filterStock === 'low' && 'ring-2 ring-amber-400',
            )}
          >
            <TriangleAlert className={cn('w-5 h-5 flex-shrink-0', kpi.low > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
            <div><p className={cn('text-lg font-bold leading-none', kpi.low > 0 && 'text-amber-600')}>{kpi.low}</p><p className="text-xs text-muted-foreground mt-0.5">Estoque baixo</p></div>
          </button>
          <button
            type="button"
            onClick={() => {}} // categories view — future
            className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left hover:bg-accent transition-colors cursor-default"
          >
            <Tag className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div><p className="text-lg font-bold leading-none">{kpi.cats}</p><p className="text-xs text-muted-foreground mt-0.5">Categorias</p></div>
          </button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="mb-2 flex flex-col sm:flex-row gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, categoria, código ou descrição..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category */}
        <select
          className={cn(
            'flex h-10 w-full sm:w-auto rounded-md border px-3 py-2 text-sm min-w-[160px] bg-background',
            filterCategory !== 'all' ? 'border-primary/50 text-primary bg-primary/5 font-medium' : 'border-input text-foreground',
          )}
          value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">Todas as categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Stock status */}
        <select
          className={cn(
            'flex h-10 w-full sm:w-auto rounded-md border px-3 py-2 text-sm min-w-[185px] bg-background',
            filterStock !== 'all' ? 'border-primary/50 text-primary bg-primary/5 font-medium' : 'border-input text-foreground',
          )}
          value={filterStock} onChange={e => setFilterStock(e.target.value)}
        >
          {STOCK_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Sort */}
        <select
          className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
          value={sort} onChange={e => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterCategory('all'); setFilterStock('all'); }} className="gap-1 text-muted-foreground whitespace-nowrap">
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* ── Active filter chips ── */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1"><Filter className="w-3 h-3" />Filtros ativos:</span>
          {activeFilters.map(f => (
            <ActiveFilter key={f.key} label={f.label} onRemove={f.clear} />
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-xs text-muted-foreground">
            {filtered.length === items.length
              ? `${items.length} iten${items.length !== 1 ? 's' : ''}`
              : `${filtered.length} de ${items.length} iten${items.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader label="Item" field="name" sort={sort} onSort={setSort} /></TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead><SortHeader label="Custo" field="cost" sort={sort} onSort={setSort} /></TableHead>
              <TableHead><SortHeader label="Venda" field="sell" sort={sort} onSort={setSort} /></TableHead>
              <TableHead><SortHeader label="Estoque" field="stock" sort={sort} onSort={setSort} /></TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(i => {
              const m = margin(i);
              const s = stockStatus(i.stockQuantity);
              return (
                <TableRow
                  key={i.id}
                  className={cn(
                    s === 'zero' && 'bg-red-50/30 hover:bg-red-50/50',
                    s === 'low'  && 'bg-amber-50/30 hover:bg-amber-50/50',
                  )}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{i.name}</span>
                      {i.sku && <span className="text-xs text-muted-foreground font-mono">{i.sku}</span>}
                      {i.description && <span className="text-xs text-muted-foreground truncate max-w-[220px]">{i.description}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {i.category ? (
                      <button
                        type="button"
                        onClick={() => setFilterCategory(i.category)}
                        className="group"
                      >
                        <Badge variant="secondary" className="text-xs font-normal group-hover:bg-primary/10 group-hover:text-primary transition-colors">{i.category}</Badge>
                      </button>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(i.costPrice)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{fmt(i.sellPrice)}</span>
                      {m > 0 && <span className="text-xs text-emerald-600">{m.toFixed(1)}% margem</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StockBadge qty={i.stockQuantity} unit={i.unit} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={deletingId === i.id} onClick={() => handleDelete(i.id, i.name)}>
                      {deletingId === i.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <EmptyState
                icon={Package}
                title={hasFilters ? 'Nenhum item encontrado' : 'Nenhum item cadastrado'}
                description={hasFilters ? 'Tente ajustar ou limpar os filtros aplicados.' : "Clique em 'Novo Item' para cadastrar o primeiro."}
                colSpan={6}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Item Form Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!saving) setDialogOpen(v); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">

          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold leading-tight">
                {editing ? 'Editar item' : 'Novo item no estoque'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {editing ? 'Atualize as informações do item abaixo.' : 'Preencha os dados para cadastrar um novo item.'}
              </DialogDescription>
            </div>
          </div>

          {/* Body */}
          <form id="item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Identificação */}
            <Section icon={Package} label="Identificação">
              <div className="space-y-1.5">
                <Label htmlFor="item-name">
                  Nome do item <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="item-name"
                    value={form.name}
                    onChange={e => setF('name', e.target.value)}
                    placeholder="Ex.: Óleo de motor 5W30, Cabo de freio..."
                    className={cn('pl-9', errors.name && 'border-destructive focus-visible:ring-destructive')}
                    autoFocus
                  />
                </div>
                <FieldError msg={errors.name} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-sku">Código / SKU <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="item-sku"
                    value={form.sku}
                    onChange={e => setF('sku', e.target.value)}
                    placeholder="Ex.: OLM-5W30, SKU-001..."
                    className="pl-9 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-desc">Descrição <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <textarea
                    id="item-desc"
                    rows={2}
                    value={form.description}
                    onChange={e => setF('description', e.target.value)}
                    placeholder="Detalhes adicionais, especificações técnicas..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>
            </Section>

            {/* Preços & Estoque */}
            <Section icon={DollarSign} label="Valores e estoque">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="item-cost">Preço de custo</Label>
                  <MoneyInput
                    value={form.costPrice}
                    onChange={v => setF('costPrice', v)}
                    icon={DollarSign}
                    placeholder="R$ 0,00"
                    error={errors.costPrice}
                  />
                  <FieldError msg={errors.costPrice} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="item-sell">Preço de venda</Label>
                    <MarginBadge cost={form.costPrice} sell={form.sellPrice} />
                  </div>
                  <MoneyInput
                    value={form.sellPrice}
                    onChange={v => setF('sellPrice', v)}
                    icon={ShoppingCart}
                    placeholder="R$ 0,00"
                    error={errors.sellPrice}
                  />
                  <FieldError msg={errors.sellPrice} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="item-qty">Quantidade em estoque</Label>
                  <div className="relative">
                    <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="item-qty"
                      inputMode="numeric"
                      value={form.stockQuantity}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        setF('stockQuantity', v);
                      }}
                      placeholder="0"
                      className={cn('pl-9', errors.stockQuantity && 'border-destructive focus-visible:ring-destructive')}
                    />
                  </div>
                  <FieldError msg={errors.stockQuantity} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="item-unit">Unidade de medida</Label>
                  <select
                    id="item-unit"
                    value={form.unit}
                    onChange={e => setF('unit', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {UNIT_OPTIONS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            {/* Classificação */}
            <Section icon={Layers} label="Classificação">
              <div className="space-y-1.5">
                <Label>Categoria <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
                <CategoryCombobox
                  value={form.category}
                  onChange={v => setF('category', v)}
                  existingCategories={categories}
                />
                <p className="text-xs text-muted-foreground">Selecione uma existente ou digite para criar nova.</p>
              </div>
            </Section>

          </form>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-card">
            {editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                disabled={saving || deletingId === editing.id}
                onClick={() => { setDialogOpen(false); handleDelete(editing.id, editing.name); }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir item
              </Button>
            )}
            <div className={cn('flex gap-2', !editing && 'ml-auto')}>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="item-form" disabled={saving}>
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Salvando...</>
                  : editing ? 'Salvar alterações' : 'Cadastrar item'}
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}
