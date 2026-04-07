import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useConfirm } from '@/components/ConfirmModal';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, FileText, TrendingUp, CheckCircle, X, Wrench,
  ShoppingCart, Printer, Search, Loader2, ChevronDown, Minus, User,
  ClipboardList, Car, MessageSquare, Tag, Clock, DollarSign, AlertTriangle,
  BarChart3, BookOpen, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';
import { printServiceOrder } from '@/utils/print';
import { cn } from '@/lib/utils';

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_MAP = {
  pending:     { label: 'Pendente',      variant: 'warning' },
  in_progress: { label: 'Em Andamento',  variant: 'default' },
  completed:   { label: 'Concluída',     variant: 'success' },
  cancelled:   { label: 'Cancelada',     variant: 'destructive' },
};

const STATUS_ORDER = ['pending', 'in_progress', 'completed', 'cancelled'];

const emptyForm = { clientId: '', vehicleId: '', description: '', status: 'pending', notes: '' };

// â”€â”€ fmt helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

// â”€â”€ SearchSelect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Combobox with live search — replaces native <select> for large lists
function SearchSelect({ value, onChange, options, placeholder = 'Selecione...', disabled = false, className }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const filtered = useMemo(() =>
    q.trim()
      ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
      : options,
    [q, options]
  );

  const select = (val) => { onChange(val); setOpen(false); };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); select(filtered[0].value); }
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:pointer-events-none',
          !selected && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={cn('w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-[60] mt-1 w-full rounded-md border border-border bg-popover shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digitar para filtrar..."
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <p className="py-3 text-center text-xs text-muted-foreground">Nenhum resultado</p>
              : filtered.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors',
                      value === o.value && 'bg-primary/5 text-primary font-medium',
                    )}
                    onMouseDown={() => select(o.value)}
                  >
                    {o.sub
                      ? <div><div className="leading-tight">{o.label}</div><div className="text-xs text-muted-foreground">{o.sub}</div></div>
                      : o.label
                    }
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ QtyControl – stepper input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function QtyControl({ value, onChange, min = 1 }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        className="h-7 w-7 flex items-center justify-center rounded-l-md border border-input bg-muted hover:bg-accent transition-colors"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="w-3 h-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
          if (!isNaN(n) && n >= min) onChange(n);
        }}
        className="h-7 w-10 text-center border-y border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        type="button"
        className="h-7 w-7 flex items-center justify-center rounded-r-md border border-input bg-muted hover:bg-accent transition-colors"
        onClick={() => onChange(value + 1)}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// â”€â”€ InlineStatusMenu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function InlineStatusMenu({ orderId, current, onChanged }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const change = async (status) => {
    setLoading(true);
    try {
      await api.patch(`/service-orders/${orderId}/status`, { status });
      toast.success('Status atualizado');
      onChanged(orderId, status);
    } catch { toast.error('Erro ao atualizar status'); }
    finally { setLoading(false); setOpen(false); }
  };

  const info = STATUS_MAP[current] || STATUS_MAP.pending;

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 focus:outline-none"
        disabled={loading}
      >
        <Badge variant={info.variant} className="gap-1 cursor-pointer hover:opacity-80 transition-opacity">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {info.label}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Badge>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-40 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          {STATUS_ORDER.map(s => (
            <button
              key={s}
              type="button"
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
                s === current && 'bg-primary/5 font-medium',
              )}
              onMouseDown={() => change(s)}
            >
              <Badge variant={STATUS_MAP[s].variant} className="text-[10px] py-0">{STATUS_MAP[s].label}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€ Section divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ── Service catalog helpers ─────────────────────────────────────────────────────────────────
const maskMoney = (raw) => {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};
const parseMoney = (masked) => parseFloat(String(masked).replace(/\./g, '').replace(',', '.')) || 0;

function parseEstimatedTime(str) {
  if (!str) return { h: '', m: '' };
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*min/i);
  return { h: hMatch ? String(parseInt(hMatch[1])) : '', m: mMatch ? String(parseInt(mMatch[1])) : '' };
}
function formatEstimatedTime(h, m) {
  const hv = parseInt(h) || 0;
  const mv = parseInt(m) || 0;
  if (!hv && !mv) return '';
  if (hv && mv) return `${hv}h ${mv}min`;
  if (hv) return `${hv}h`;
  return `${mv}min`;
}
function estimatedToMinutes(str) {
  if (!str) return 0;
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*min/i);
  return (parseInt(hMatch?.[1]) || 0) * 60 + (parseInt(mMatch?.[1]) || 0);
}
function isSimilarServiceName(a, b) {
  const norm = s => s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const na = norm(a); const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.includes(na)) return true;
  if (nb.length >= 4 && na.includes(nb)) return true;
  return false;
}

const SERVICE_STATUS = {
  active:      { label: 'Ativo',            cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  inactive:    { label: 'Inativo',           cls: 'bg-muted text-muted-foreground border border-border' },
  unavailable: { label: 'Indisponível', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
};

// ── ServiceCategoryCombobox ───────────────────────────────────────────────────────────────
function ServiceCategoryCombobox({ value, onChange, existingCategories }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = q.trim()
    ? existingCategories.filter(cat => cat.toLowerCase().includes(q.toLowerCase()))
    : existingCategories;
  const showCreate = q.trim() && !existingCategories.some(cat => cat.toLowerCase() === q.toLowerCase());

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={open ? q : (value || '')}
          onFocus={() => { setOpen(true); setQ(value || ''); }}
          onChange={e => { setQ(e.target.value); onChange(e.target.value); }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered.length > 0) { onChange(filtered[0]); setQ(''); setOpen(false); }
              else if (showCreate) { onChange(q.trim()); setQ(''); setOpen(false); }
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Categoria do serviço..."
          className="pl-9"
        />
        {value && (
          <button type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { onChange(''); setQ(''); setOpen(false); }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-[60] mt-1 w-full rounded-md border border-border bg-popover shadow-xl overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {filtered.map(cat => (
              <button key={cat} type="button"
                className={cn('w-full px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors', value === cat && 'bg-primary/5 text-primary font-medium')}
                onMouseDown={() => { onChange(cat); setQ(''); setOpen(false); }}>
                {cat}
              </button>
            ))}
            {showCreate && (
              <button type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left text-primary hover:bg-accent transition-colors border-t border-border"
                onMouseDown={() => { onChange(q.trim()); setQ(''); setOpen(false); }}>
                <Plus className="w-3.5 h-3.5" /> Criar "{q.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ServiceMoneyInput ───────────────────────────────────────────────────────────────────────
function ServiceMoneyInput({ value, onChange, placeholder = '0,00' }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">R$</span>
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(digits ? maskMoney(digits) : '');
        }}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
}

export default function ServiceOrders() {
  const [confirmModal, confirm] = useConfirm();
  const [activeTab, setActiveTab] = useState('orders');

  // â”€â”€ Orders state â”€â”€
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedServices, setSelectedServices] = useState([]);
  const [addServiceId, setAddServiceId] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [addItemId, setAddItemId] = useState('');

  const { tenant } = useTenant();
  const [financialDialog, setFinancialDialog] = useState(null);
  const [searchOS, setSearchOS] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // â”€â”€ Services tab state â”€â”€
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', priceStr: '', estimatedH: '', estimatedM: '', category: '', status: 'active', notes: '' });
  const [searchService, setSearchService] = useState('');
  const [filterServiceCategory, setFilterServiceCategory] = useState('');
  const [sortService, setSortService] = useState('name-asc');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState(null);

  const load = async () => {
    try {
      const [o, c, v, s, i] = await Promise.all([
        api.get('/service-orders'),
        api.get('/clients'),
        api.get('/vehicles').catch(() => ({ data: { data: [] } })),
        api.get('/services'),
        api.get('/items'),
      ]);
      setOrders(o.data.data || []);
      setClients(c.data.data || []);
      setAllVehicles(v.data.data || []);
      setAvailableServices(s.data.data || []);
      setAllItems(i.data.data || []);
    } catch { toast.error('Erro ao carregar'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // â”€â”€ Inline status change (list) â”€â”€
  const handleInlineStatusChange = useCallback((orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  }, []);

  const clientVehicles = useMemo(
    () => allVehicles.filter(v => v.clientId === form.clientId),
    [allVehicles, form.clientId]
  );

  const servicesTotal = useMemo(() => selectedServices.reduce((s, x) => s + x.total, 0), [selectedServices]);
  const itemsTotal = useMemo(() => selectedItems.reduce((s, x) => s + x.total, 0), [selectedItems]);
  const total = servicesTotal + itemsTotal;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedServices([]);
    setAddServiceId('');
    setSelectedItems([]);
    setAddItemId('');
    setDialogOpen(true);
  };

  const openEdit = (o) => {
    setEditing(o);
    setForm({ clientId: o.clientId, vehicleId: o.vehicleId || '', description: o.description || '', status: o.status, notes: o.notes || '' });
    setSelectedServices((o.services || []).map(s => ({
      serviceId: s.serviceId, serviceName: s.service?.name || '',
      quantity: s.quantity, unitPrice: s.unitPrice, total: s.total,
    })));
    setSelectedItems((o.items || []).map(i => ({
      itemId: i.itemId, itemName: i.item?.name || '',
      quantity: i.quantity, unitPrice: i.unitPrice, total: i.total,
    })));
    setAddServiceId(''); setAddItemId('');
    setDialogOpen(true);
  };

  // â”€â”€ Add service â”€â”€
  const addService = useCallback((id) => {
    const sid = id ?? addServiceId;
    if (!sid) return;
    const svc = availableServices.find(s => s.id === sid);
    if (!svc) return;
    if (selectedServices.some(s => s.serviceId === sid)) { toast.error('Serviço já adicionado'); return; }
    setSelectedServices(prev => [...prev, { serviceId: svc.id, serviceName: svc.name, quantity: 1, unitPrice: svc.price, total: svc.price }]);
    setAddServiceId('');
    toast.success(`"${svc.name}" adicionado`, { duration: 1500 });
  }, [addServiceId, availableServices, selectedServices]);

  const removeService = (sid) => setSelectedServices(prev => prev.filter(s => s.serviceId !== sid));
  const updateServiceQty = (sid, qty) => setSelectedServices(prev => prev.map(s =>
    s.serviceId !== sid ? s : { ...s, quantity: qty, total: qty * s.unitPrice }
  ));
  const updateServicePrice = (sid, price) => {
    const up = parseFloat(String(price).replace(',', '.')) || 0;
    setSelectedServices(prev => prev.map(s =>
      s.serviceId !== sid ? s : { ...s, unitPrice: up, total: s.quantity * up }
    ));
  };

  // â”€â”€ Add item â”€â”€
  const addItem = useCallback((id) => {
    const iid = id ?? addItemId;
    if (!iid) return;
    const itm = allItems.find(i => i.id === iid);
    if (!itm) return;
    if (selectedItems.some(i => i.itemId === iid)) { toast.error('Item já adicionado'); return; }
    setSelectedItems(prev => [...prev, { itemId: itm.id, itemName: itm.name, quantity: 1, unitPrice: itm.sellPrice, total: itm.sellPrice }]);
    setAddItemId('');
    toast.success(`"${itm.name}" adicionado`, { duration: 1500 });
  }, [addItemId, allItems, selectedItems]);

  const removeItem = (iid) => setSelectedItems(prev => prev.filter(i => i.itemId !== iid));
  const updateItemQty = (iid, qty) => setSelectedItems(prev => prev.map(i =>
    i.itemId !== iid ? i : { ...i, quantity: qty, total: qty * i.unitPrice }
  ));
  const updateItemPrice = (iid, price) => {
    const up = parseFloat(String(price).replace(',', '.')) || 0;
    setSelectedItems(prev => prev.map(i =>
      i.itemId !== iid ? i : { ...i, unitPrice: up, total: i.quantity * up }
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Selecione um cliente'); return; }
    const payload = {
      ...form,
      vehicleId: form.vehicleId || undefined,
      total,
      services: selectedServices.map(s => ({ serviceId: s.serviceId, quantity: s.quantity, unitPrice: s.unitPrice, total: s.total })),
      items: selectedItems.map(i => ({ itemId: i.itemId, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
    };
    setSaving(true);
    try {
      let orderId;
      if (editing) {
        await api.put(`/service-orders/${editing.id}`, payload);
        orderId = editing.id;
        toast.success('OS atualizada', { description: 'As alterações foram salvas.' });
      } else {
        const res = await api.post('/service-orders', payload);
        orderId = res.data.data?.id;
        toast.success('OS criada', { description: 'A ordem de serviço foi aberta.' });
      }
      setDialogOpen(false);
      load();
      const alreadySent = editing?.financials?.length > 0;
      if (form.status === 'completed' && total > 0 && !alreadySent && orderId) {
        const clientName = clients.find(c => c.id === form.clientId)?.name || '';
        setFinancialDialog({ orderId, total, clientName });
      }
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  };

  const sendToFinancial = async (orderId) => {
    setSavingFinancial(true);
    try {
      await api.post(`/service-orders/${orderId}/to-financial`);
      toast.success('Receita lançada no financeiro!');
      setFinancialDialog(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao lançar');
    } finally { setSavingFinancial(false); }
  };

  const handleDelete = async (id, label) => {
    const ok = await confirm({
      title: 'Excluir ordem de serviço',
      description: 'A OS será removida permanentemente junto com seus lançamentos vinculados.',
      item: label,
      confirmLabel: 'Excluir OS',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingId(id);
    try { await api.delete(`/service-orders/${id}`); toast.success('Ordem de serviço removida'); load(); }
    catch { toast.error('Erro ao remover OS'); }
    finally { setDeletingId(null); }
  };

  // â”€â”€ Services tab handlers â”€â”€
  const openNewService = () => {
    setEditingService(null);
    setServiceForm({ name: '', description: '', priceStr: '', estimatedH: '', estimatedM: '', category: '', status: 'active', notes: '' });
    setDuplicateWarning(null);
    setIgnoreDuplicate(false);
    setServiceDialogOpen(true);
  };
  const openEditService = (s) => {
    setEditingService(s);
    const { h, m } = parseEstimatedTime(s.estimatedTime || '');
    setServiceForm({
      name: s.name,
      description: s.description || '',
      priceStr: s.price ? maskMoney(Math.round(s.price * 100)) : '',
      estimatedH: h,
      estimatedM: m,
      category: s.category || '',
      status: s.status || 'active',
      notes: s.notes || '',
    });
    setDuplicateWarning(null);
    setIgnoreDuplicate(false);
    setServiceDialogOpen(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) { toast.error('Nome é obrigatório'); return; }

    // Duplicate check
    if (!ignoreDuplicate) {
      const similar = availableServices.filter(s =>
        (!editingService || s.id !== editingService.id) &&
        isSimilarServiceName(serviceForm.name, s.name)
      );
      if (similar.length > 0) { setDuplicateWarning(similar[0].name); return; }
    }

    const estimatedTime = formatEstimatedTime(serviceForm.estimatedH, serviceForm.estimatedM);
    const data = {
      name: serviceForm.name.trim(),
      description: serviceForm.description,
      price: parseMoney(serviceForm.priceStr),
      estimatedTime,
      category: serviceForm.category,
      status: serviceForm.status,
      notes: serviceForm.notes,
    };
    setSavingService(true);
    try {
      if (editingService) { await api.put(`/services/${editingService.id}`, data); toast.success('Serviço atualizado'); }
      else { await api.post('/services', data); toast.success('Serviço criado'); }
      setServiceDialogOpen(false);
      setDuplicateWarning(null);
      setIgnoreDuplicate(false);
      load();
    } catch { toast.error('Erro ao salvar'); } finally { setSavingService(false); }
  };

  const handleServiceDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Excluir serviço',
      description: 'O serviço será removido permanentemente do catálogo.',
      item: name,
      confirmLabel: 'Excluir serviço',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingServiceId(id);
    try { await api.delete(`/services/${id}`); toast.success('Removido'); load(); }
    catch { toast.error('Erro'); }
    finally { setDeletingServiceId(null); }
  };

  // â”€â”€ Derived â”€â”€
  const autoTypes = ['auto', 'oficina'];
  const isAutoType = autoTypes.includes(tenant?.businessType);
  const vehicleLabel = isAutoType ? 'Veículo' : 'Referência';
  const showVehicleCol = isAutoType || orders.some(o => o.vehicle);

  const filteredOrders = useMemo(() => orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (searchOS) {
      const q = searchOS.toLowerCase();
      const idShort = o.id.slice(0, 8).toLowerCase();
      const serviceNames = (o.services || []).map(s => (s.service?.name || '').toLowerCase()).join(' ');
      const itemNames = (o.items || []).map(i => (i.item?.name || '').toLowerCase()).join(' ');
      if (
        !(o.client?.name || '').toLowerCase().includes(q) &&
        !(o.description || '').toLowerCase().includes(q) &&
        !(o.vehicle?.plate || '').toLowerCase().includes(q) &&
        !idShort.includes(q) &&
        !serviceNames.includes(q) &&
        !itemNames.includes(q)
      ) return false;
    }
    return true;
  }), [orders, filterStatus, searchOS]);

  // â”€â”€ SearchSelect options â”€â”€
  const clientOptions = useMemo(() => clients.map(c => ({
    value: c.id, label: c.name,
    sub: c.document || c.phone || undefined,
  })), [clients]);

  const vehicleOptions = useMemo(() => [
    { value: '', label: `Sem ${vehicleLabel.toLowerCase()}` },
    ...clientVehicles.map(v => ({ value: v.id, label: `${v.brand || ''} ${v.model || ''}`.trim(), sub: v.plate })),
  ], [clientVehicles, vehicleLabel]);

  const servicesNotAdded = useMemo(() => availableServices.filter(s => !selectedServices.some(ss => ss.serviceId === s.id)), [availableServices, selectedServices]);
  const itemsNotAdded = useMemo(() => allItems.filter(i => !selectedItems.some(si => si.itemId === i.id)), [allItems, selectedItems]);

  const serviceOptions = useMemo(() => [
    { value: '', label: 'Selecionar serviço...' },
    ...servicesNotAdded.map(s => ({ value: s.id, label: s.name, sub: fmt(s.price) })),
  ], [servicesNotAdded]);

  const itemOptions = useMemo(() => [
    { value: '', label: 'Selecionar peça / produto...' },
    ...itemsNotAdded.map(i => ({ value: i.id, label: i.name, sub: `${fmt(i.sellPrice)} · estoque: ${i.stockQuantity}` })),
  ], [itemsNotAdded]);

  // â”€â”€ Status filters counts â”€â”€
  const statusCounts = useMemo(() => {
    const c = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => { if (c[o.status] !== undefined) c[o.status]++; });
    return c;
  }, [orders]);

  // ── Service catalog derived values ──
  const serviceCategories = useMemo(() => {
    const cats = new Set(availableServices.map(s => s.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [availableServices]);

  const filteredServices = useMemo(() => {
    let result = [...availableServices];
    if (searchService.trim()) {
      const q = searchService.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      );
    }
    if (filterServiceCategory) result = result.filter(s => s.category === filterServiceCategory);
    result.sort((a, b) => {
      switch (sortService) {
        case 'name-asc':   return a.name.localeCompare(b.name, 'pt-BR');
        case 'name-desc':  return b.name.localeCompare(a.name, 'pt-BR');
        case 'price-asc':  return (a.price || 0) - (b.price || 0);
        case 'price-desc': return (b.price || 0) - (a.price || 0);
        case 'time-asc':   return estimatedToMinutes(a.estimatedTime) - estimatedToMinutes(b.estimatedTime);
        case 'time-desc':  return estimatedToMinutes(b.estimatedTime) - estimatedToMinutes(a.estimatedTime);
        default: return 0;
      }
    });
    return result;
  }, [availableServices, searchService, filterServiceCategory, sortService]);

  const serviceKpi = useMemo(() => {
    const total = availableServices.length;
    const active = availableServices.filter(s => !s.status || s.status === 'active').length;
    const cats = new Set(availableServices.map(s => s.category).filter(Boolean)).size;
    const prices = availableServices.map(s => s.price || 0).filter(p => p > 0);
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    return { total, active, cats, avgPrice };
  }, [availableServices]);


  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      {confirmModal}
      <PageHeader
        title="Ordens de Serviço"
        description={activeTab === 'orders'
          ? `${orders.length} ordem${orders.length !== 1 ? 's' : ''}`
          : 'Catálogo de serviços da empresa — base para ordens de serviço'
        }
      >
        {activeTab === 'orders'
          ? <Button onClick={openNew}><Plus className="w-4 h-4" /> Nova OS</Button>
          : <Button onClick={openNewService}><Plus className="w-4 h-4" /> Novo Serviço</Button>
        }
      </PageHeader>

      {/* â”€â”€ Tabs â”€â”€ */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {[
          { key: 'orders', label: 'Ordens de Serviço', icon: FileText },
          { key: 'services', label: 'Catálogo de Serviços', icon: Wrench },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* â”€â”€ ORDERS TAB â”€â”€ */}
      {activeTab === 'orders' && (
        <>
          {/* Status quick-filter strip */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={cn(
                'h-8 px-3 rounded-full border text-xs font-medium transition-colors',
                filterStatus === 'all' ? 'bg-foreground text-background border-foreground' : 'border-input bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              Todas <span className="ml-1 opacity-70">({orders.length})</span>
            </button>
            {STATUS_ORDER.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(fs => fs === s ? 'all' : s)}
                className={cn(
                  'h-8 px-3 rounded-full border text-xs font-medium transition-colors',
                  filterStatus === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {STATUS_MAP[s].label}
                <span className="ml-1 opacity-70">({statusCounts[s]})</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar por cliente, descrição, ID${showVehicleCol ? ', placa' : ''}, serviço ou peça...`}
                className="pl-9"
                value={searchOS}
                onChange={e => setSearchOS(e.target.value)}
              />
              {searchOS && (
                <button type="button" onClick={() => setSearchOS('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {(searchOS || filterStatus !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchOS(''); setFilterStatus('all'); }} className="gap-1 text-muted-foreground whitespace-nowrap">
                <X className="w-3.5 h-3.5" /> Limpar
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-xs text-muted-foreground">
                {filteredOrders.length === orders.length
                  ? `${orders.length} ordem${orders.length !== 1 ? 's' : ''}`
                  : `${filteredOrders.length} de ${orders.length}`}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  {showVehicleCol && <TableHead>{vehicleLabel}</TableHead>}
                  <TableHead>Serviços / Peças</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm leading-tight">{o.client?.name || '—'}</p>
                        {o.description && <p className="text-xs text-muted-foreground truncate max-w-[140px]">{o.description}</p>}
                      </div>
                    </TableCell>
                    {showVehicleCol && (
                      <TableCell className="text-sm text-muted-foreground">
                        {o.vehicle ? `${o.vehicle.brand || ''} ${o.vehicle.model || ''} — ${o.vehicle.plate}`.trim() : '—'}
                      </TableCell>
                    )}
                    <TableCell className="max-w-[180px]">
                      <div className="space-y-0.5">
                        {o.services?.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-start gap-1">
                            <Wrench className="w-3 h-3 mt-0.5 opacity-50 flex-shrink-0" />
                            <span className="truncate">{o.services.map(s => s.service?.name).join(', ')}</span>
                          </span>
                        )}
                        {o.items?.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-start gap-1">
                            <ShoppingCart className="w-3 h-3 mt-0.5 opacity-50 flex-shrink-0" />
                            <span className="truncate">{o.items.map(i => i.item?.name).join(', ')}</span>
                          </span>
                        )}
                        {!o.services?.length && !o.items?.length && (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <InlineStatusMenu orderId={o.id} current={o.status} onChanged={handleInlineStatusChange} />
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{fmt(o.total)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {o.status === 'completed' && o.total > 0 && o.financials?.length === 0 && (
                          <Button
                            variant="outline" size="sm"
                            className="h-7 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => setFinancialDialog({ orderId: o.id, total: o.total, clientName: o.client?.name || '' })}
                          >
                            <TrendingUp className="w-3 h-3" /> Financeiro
                          </Button>
                        )}
                        {o.financials?.length > 0 && (
                          <Badge variant="success" className="gap-1 text-xs">
                            <CheckCircle className="w-3 h-3" /> Lançado
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" title="Imprimir OS" onClick={() => printServiceOrder(o, tenant)}>
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(o)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={deletingId === o.id} onClick={() => handleDelete(o.id, o.description || o.client?.name || 'OS')}>
                          {deletingId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <EmptyState
                    icon={FileText}
                    title={searchOS || filterStatus !== 'all' ? 'Nenhum resultado' : 'Nenhuma OS'}
                    description={searchOS || filterStatus !== 'all' ? 'Ajuste os filtros' : "Clique em 'Nova OS' para criar"}
                    colSpan={showVehicleCol ? 8 : 7}
                  />
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* â”€â”€ SERVICES TAB â”€â”€ */}
      {activeTab === 'services' && (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total de serviços', value: serviceKpi.total, icon: Wrench, color: 'text-primary', bg: 'bg-primary/5' },
              { label: 'Ativos', value: serviceKpi.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Categorias', value: serviceKpi.cats, icon: Tag, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Preço médio', value: serviceKpi.avgPrice > 0 ? fmt(serviceKpi.avgPrice) : '—', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                  <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, descrição ou categoria..."
                className="pl-9"
                value={searchService}
                onChange={e => setSearchService(e.target.value)}
              />
              {searchService && (
                <button type="button" onClick={() => setSearchService('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={filterServiceCategory}
              onChange={e => setFilterServiceCategory(e.target.value)}
              className={cn(
                'h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filterServiceCategory && 'border-primary bg-primary/5 text-primary',
              )}
            >
              <option value="">Todas as categorias</option>
              {serviceCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={sortService}
              onChange={e => setSortService(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="name-asc">Nome A–Z</option>
              <option value="name-desc">Nome Z–A</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
              <option value="time-asc">Menor duração</option>
              <option value="time-desc">Maior duração</option>
            </select>
            {(searchService || filterServiceCategory) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchService(''); setFilterServiceCategory(''); }} className="gap-1 text-muted-foreground whitespace-nowrap">
                <X className="w-3.5 h-3.5" /> Limpar
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {filteredServices.length === availableServices.length
                    ? `${availableServices.length} serviço${availableServices.length !== 1 ? 's' : ''} no catálogo`
                    : `${filteredServices.length} de ${availableServices.length}`}
                </span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />Preço</span>
                  </TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Duração</span>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((s, idx) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-center text-xs text-muted-foreground/50 font-mono">{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{s.name}</p>
                        {s.description && <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">{s.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.category
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-medium"><Tag className="w-2.5 h-2.5" />{s.category}</span>
                        : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm">{fmt(s.price)}</span>
                    </TableCell>
                    <TableCell>
                      {s.estimatedTime
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-medium"><Clock className="w-2.5 h-2.5" />{s.estimatedTime}</span>
                        : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const st = SERVICE_STATUS[s.status] || SERVICE_STATUS.active;
                        return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditService(s)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" disabled={deletingServiceId === s.id} onClick={() => handleServiceDelete(s.id, s.name)}>
                        {deletingServiceId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredServices.length === 0 && (
                  <EmptyState
                    icon={Wrench}
                    title={searchService || filterServiceCategory ? 'Nenhum resultado' : 'Catálogo vazio'}
                    description={searchService || filterServiceCategory ? 'Ajuste os filtros' : "Clique em 'Novo Serviço' para começar"}
                    colSpan={7}
                  />
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={v => { if (!saving) setDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col p-0 gap-0">

          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold leading-tight">
                {editing ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editing ? `OS #${editing.id.slice(0, 8)}` : 'Preencha os dados para abrir uma nova OS'}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Cliente + Status */}
            <Section icon={User} label="Cliente e status">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Cliente <span className="text-destructive">*</span></Label>
                  <SearchSelect
                    value={form.clientId}
                    onChange={v => setForm(f => ({ ...f, clientId: v, vehicleId: '' }))}
                    options={clientOptions}
                    placeholder="Buscar cliente..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
                  </select>
                </div>
              </div>

              {form.clientId && clientVehicles.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-muted-foreground" />{vehicleLabel}</Label>
                  <SearchSelect
                    value={form.vehicleId}
                    onChange={v => setForm(f => ({ ...f, vehicleId: v }))}
                    options={vehicleOptions}
                    placeholder={`Selecionar ${vehicleLabel.toLowerCase()}...`}
                  />
                </div>
              )}
            </Section>

            {/* Descrição */}
            <Section icon={MessageSquare} label="Descrição do problema / serviço solicitado">
              <Textarea
                placeholder="Descreva o problema relatado pelo cliente ou o serviço solicitado..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="min-h-[80px] resize-none"
              />
            </Section>

            {/* Serviços */}
            <Section
              icon={Wrench}
              label="Serviços realizados"
              right={selectedServices.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground normal-case tracking-normal">
                  {selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''}
                  {servicesTotal > 0 && <> · <span className="font-semibold text-foreground">{fmt(servicesTotal)}</span></>}
                </span>
              )}
            >
              {/* Add row */}
              {servicesNotAdded.length > 0 && (
                <div className="flex gap-2">
                  <SearchSelect
                    value={addServiceId}
                    onChange={v => { setAddServiceId(v); if (v) { setTimeout(() => addService(v), 0); } }}
                    options={serviceOptions}
                    placeholder="Buscar e adicionar serviço..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-1.5 px-3 whitespace-nowrap"
                    onClick={() => addService()}
                    disabled={!addServiceId}
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </Button>
                </div>
              )}
              {availableServices.length === 0 && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  Nenhum serviço cadastrado. Use a aba <strong>Serviços</strong> para cadastrar o catálogo.
                </p>
              )}
              {selectedServices.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Serviço</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Quantidade</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Preço unit.</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Subtotal</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedServices.map(s => (
                        <tr key={s.serviceId}>
                          <td className="px-3 py-2.5 font-medium text-sm">{s.serviceName}</td>
                          <td className="px-2 py-2 text-center">
                            <QtyControl value={s.quantity} onChange={qty => updateServiceQty(s.serviceId, qty)} />
                          </td>
                          <td className="px-2 py-2.5">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={s.unitPrice}
                              onChange={e => updateServicePrice(s.serviceId, e.target.value)}
                              className="h-8 w-24 text-right ml-auto"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-sm">{fmt(s.total)}</td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeService(s.serviceId)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border/60 rounded-xl py-6 flex flex-col items-center gap-1.5">
                  <Wrench className="w-6 h-6 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum serviço adicionado</p>
                  <p className="text-xs text-muted-foreground/60">Selecione um serviço acima para incluir na OS</p>
                </div>
              )}
            </Section>

            {/* Peças / Itens */}
            <Section
              icon={ShoppingCart}
              label="Peças / Produtos"
              right={selectedItems.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground normal-case tracking-normal">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
                  {itemsTotal > 0 && <> · <span className="font-semibold text-foreground">{fmt(itemsTotal)}</span></>}
                </span>
              )}
            >
              {itemsNotAdded.length > 0 && (
                <div className="flex gap-2">
                  <SearchSelect
                    value={addItemId}
                    onChange={v => { setAddItemId(v); if (v) { setTimeout(() => addItem(v), 0); } }}
                    options={itemOptions}
                    placeholder="Buscar e adicionar peça / produto..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-1.5 px-3 whitespace-nowrap"
                    onClick={() => addItem()}
                    disabled={!addItemId}
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </Button>
                </div>
              )}
              {allItems.length === 0 && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  Nenhum item no estoque. Cadastre em <strong>Estoque</strong>.
                </p>
              )}
              {selectedItems.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produto</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Quantidade</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Preço unit.</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Subtotal</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedItems.map(i => (
                        <tr key={i.itemId}>
                          <td className="px-3 py-2.5 font-medium text-sm">{i.itemName}</td>
                          <td className="px-2 py-2 text-center">
                            <QtyControl value={i.quantity} onChange={qty => updateItemQty(i.itemId, qty)} />
                          </td>
                          <td className="px-2 py-2.5">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={i.unitPrice}
                              onChange={e => updateItemPrice(i.itemId, e.target.value)}
                              className="h-8 w-24 text-right ml-auto"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-sm">{fmt(i.total)}</td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(i.itemId)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border/60 rounded-xl py-6 flex flex-col items-center gap-1.5">
                  <ShoppingCart className="w-6 h-6 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma peça adicionada</p>
                  <p className="text-xs text-muted-foreground/60">Selecione um produto do estoque acima</p>
                </div>
              )}
            </Section>

            {/* Observação interna */}
            <Section icon={MessageSquare} label="Observação interna">
              <Textarea
                placeholder="Anotações internas, notas para a equipe técnica... (não aparece na impressão)"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="min-h-[64px] resize-none"
              />
            </Section>

          </div>

          {/* Footer with total */}
          <div className="flex-shrink-0 border-t border-border">
            {/* Total bar */}
            {(selectedServices.length > 0 || selectedItems.length > 0) && (
              <div className="flex items-center justify-between gap-4 px-6 py-3 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {servicesTotal > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> <span className="font-medium text-foreground">{fmt(servicesTotal)}</span>
                    </span>
                  )}
                  {itemsTotal > 0 && (
                    <span className="flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" /> <span className="font-medium text-foreground">{fmt(itemsTotal)}</span>
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total da OS</p>
                  <p className="text-2xl font-bold text-foreground leading-tight">{fmt(total)}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end px-6 py-4">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="button" disabled={saving} onClick={handleSubmit}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Salvando...</> : editing ? 'Salvar alterações' : 'Abrir OS'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Service Form Dialog â”€â”€ */}
      <Dialog open={serviceDialogOpen} onOpenChange={v => { if (!savingService) { setServiceDialogOpen(v); setDuplicateWarning(null); setIgnoreDuplicate(false); } }}>
        <DialogContent className="max-w-lg max-h-[95vh] flex flex-col p-0 gap-0">

          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingService ? 'Atualize as informações do serviço no catálogo' : 'Adicione um novo serviço ao catálogo da empresa'}
              </p>
            </div>
          </div>

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Serviço semelhante encontrado</p>
                <p className="text-xs text-amber-700 mt-0.5">Já existe “<strong>{duplicateWarning}</strong>” no catálogo. Deseja cadastrar mesmo assim?</p>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => { setIgnoreDuplicate(true); setDuplicateWarning(null); }} className="text-xs font-medium text-amber-800 underline hover:no-underline">Sim, cadastrar mesmo assim</button>
                  <span className="text-amber-400">·</span>
                  <button type="button" onClick={() => setDuplicateWarning(null)} className="text-xs text-amber-700 hover:text-amber-800">Revisar</button>
                </div>
              </div>
            </div>
          )}

          {/* Body */}
          <form onSubmit={handleServiceSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Nome e status */}
              <Section icon={Wrench} label="Identificação">
                <div className="space-y-1.5">
                  <Label>Nome do serviço <span className="text-destructive">*</span></Label>
                  <Input
                    value={serviceForm.name}
                    onChange={e => { setServiceForm(f => ({ ...f, name: e.target.value })); setDuplicateWarning(null); setIgnoreDuplicate(false); }}
                    placeholder="Ex: Troca de óleo, Alinhamento e balanceamento..."
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição <span className="text-xs font-normal text-muted-foreground">(opcional)</span></Label>
                  <Textarea
                    value={serviceForm.description}
                    onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descreva o serviço, o que inclui, quais etapas..."
                    className="min-h-[72px] resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <ServiceCategoryCombobox
                    value={serviceForm.category}
                    onChange={v => setServiceForm(f => ({ ...f, category: v }))}
                    existingCategories={serviceCategories}
                  />
                  <p className="text-xs text-muted-foreground">Agrupe serviços por tipo para facilitar a busca nas OSs.</p>
                </div>
              </Section>

              {/* Preço e tempo */}
              <Section icon={DollarSign} label="Preço e duração">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-muted-foreground" />Preço</Label>
                    <ServiceMoneyInput
                      value={serviceForm.priceStr}
                      onChange={v => setServiceForm(f => ({ ...f, priceStr: v }))}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">Preço padrão sugerido ao adicionar à OS.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" />Duração estimada</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={serviceForm.estimatedH}
                          onChange={e => setServiceForm(f => ({ ...f, estimatedH: e.target.value.replace(/\D/g, '') }))}
                          placeholder="0"
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                      </div>
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={serviceForm.estimatedM}
                          onChange={e => {
                            const v = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                            setServiceForm(f => ({ ...f, estimatedM: v > 59 ? '59' : String(v || '') }));
                          }}
                          placeholder="0"
                          className="pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                      </div>
                    </div>
                    {(serviceForm.estimatedH || serviceForm.estimatedM) && (
                      <p className="text-xs text-primary">⏱ {formatEstimatedTime(serviceForm.estimatedH, serviceForm.estimatedM)}</p>
                    )}
                  </div>
                </div>
              </Section>

              {/* Disponibilidade */}
              <Section icon={BarChart3} label="Disponibilidade">
                <div className="space-y-1.5">
                  <Label>Status do serviço</Label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(SERVICE_STATUS).map(([key, info]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setServiceForm(f => ({ ...f, status: key }))}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                          serviceForm.status === key
                            ? info.cls + ' ring-2 ring-offset-1 ring-current opacity-100'
                            : 'border-input bg-background text-muted-foreground hover:bg-accent',
                        )}
                      >
                        {info.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Serviços inativos ou indisponíveis não aparecerão para seleção nas OSs.</p>
                </div>
              </Section>

              {/* Observação interna */}
              <Section icon={MessageSquare} label="Observação interna">
                <Textarea
                  value={serviceForm.notes}
                  onChange={e => setServiceForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Anotações internas sobre este serviço (não visível ao cliente)..."
                  className="min-h-[60px] resize-none"
                />
              </Section>

            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end px-6 py-4 border-t border-border flex-shrink-0">
              <Button type="button" variant="outline" disabled={savingService} onClick={() => { setServiceDialogOpen(false); setDuplicateWarning(null); setIgnoreDuplicate(false); }}>Cancelar</Button>
              <Button type="submit" disabled={savingService}>
                {savingService ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Salvando...</> : editingService ? 'Salvar alterações' : 'Adicionar ao catálogo'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!financialDialog} onOpenChange={() => setFinancialDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Lançar no Financeiro?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deseja registrar{' '}
              <span className="font-semibold text-foreground">{fmt(financialDialog?.total)}</span>
              {financialDialog?.clientName && <> de <span className="font-semibold text-foreground">{financialDialog.clientName}</span></>}{' '}
              como receita no módulo financeiro?
            </p>
            <div className="flex gap-3">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" disabled={savingFinancial} onClick={() => sendToFinancial(financialDialog?.orderId)}>
                {savingFinancial ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />} Sim, lançar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setFinancialDialog(null)}>Agora não</Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">Se não lançar agora, o botão ficará disponível na OS.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

