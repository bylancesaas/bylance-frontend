import { useEffect, useState } from 'react';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMemo } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, FileText, Wrench, ShoppingCart, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Financial() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalExpenses: 0, profit: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'revenue', category: '', description: '', value: 0, date: new Date().toISOString().split('T')[0] });
  const [detailDialog, setDetailDialog] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    try {
      const [r, s] = await Promise.all([api.get('/financial'), api.get('/financial/summary')]);
      setRecords(r.data.data || []);
      setSummary(s.data.data || { totalRevenue: 0, totalExpenses: 0, profit: 0 });
    } catch { toast.error('Erro'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ type: 'revenue', category: '', description: '', value: 0, date: new Date().toISOString().split('T')[0] }); setDialogOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ type: r.type, category: r.category || '', description: r.description || '', value: r.value, date: r.date?.substring(0, 10) || '' }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, value: parseFloat(form.value), date: new Date(form.date).toISOString() };
    try {
      if (editing) { await api.put(`/financial/${editing.id}`, data); toast.success('Atualizado'); }
      else { await api.post('/financial', data); toast.success('Criado'); }
      setDialogOpen(false); load();
    } catch { toast.error('Erro'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover?')) return;
    try { await api.delete(`/financial/${id}`); toast.success('Removido'); load(); } catch { toast.error('Erro'); }
  };

  const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(r.description || '').toLowerCase().includes(q) && !(r.category || '').toLowerCase().includes(q)) return false;
      }
      if (dateFrom && new Date(r.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(r.date) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [records, search, filterType, dateFrom, dateTo]);

  const filteredRevenue = useMemo(() => filtered.filter(r => r.type === 'revenue').reduce((s, r) => s + r.value, 0), [filtered]);
  const filteredExpenses = useMemo(() => filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.value, 0), [filtered]);
  const filteredProfit = filteredRevenue - filteredExpenses;
  const hasFilters = search || filterType !== 'all' || dateFrom || dateTo;

  const clearFilters = () => { setSearch(''); setFilterType('all'); setDateFrom(''); setDateTo(''); };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Financeiro" description="Receitas e despesas"><Button onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button></PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title={hasFilters ? 'Receitas (filtrado)' : 'Receitas'} value={fmt(hasFilters ? filteredRevenue : summary.totalRevenue)} icon={TrendingUp} />
        <StatCard title={hasFilters ? 'Despesas (filtrado)' : 'Despesas'} value={fmt(hasFilters ? filteredExpenses : summary.totalExpenses)} icon={TrendingDown} />
        <StatCard title={hasFilters ? 'Lucro (filtrado)' : 'Lucro'} value={fmt(hasFilters ? filteredProfit : summary.profit)} icon={DollarSign} />
      </div>

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar descrição ou categoria..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[130px]"
          value={filterType} onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">Todos os tipos</option>
          <option value="revenue">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input type="date" className="h-10 flex-1 sm:w-36 sm:flex-none" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="De" />
          <span className="text-muted-foreground text-sm shrink-0">até</span>
          <Input type="date" className="h-10 flex-1 sm:w-36 sm:flex-none" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Até" />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="w-3.5 h-3.5" /> Limpar
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell><Badge variant={r.type === 'revenue' ? 'success' : 'destructive'}>{r.type === 'revenue' ? 'Receita' : 'Despesa'}</Badge></TableCell>
                <TableCell>{r.category || '-'}</TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{r.description || '-'}</span>
                    {r.serviceOrderId && (
                      <button
                        onClick={() => setDetailDialog(r)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-md px-1.5 py-0.5 transition-colors"
                      >
                        <FileText className="w-3 h-3" /> OS
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{fmt(r.value)}</TableCell>
                <TableCell>{r.date ? new Date(r.date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <EmptyState icon={DollarSign} title={hasFilters ? 'Nenhum resultado' : 'Nenhum registro'} description={hasFilters ? 'Ajuste os filtros para ver resultados' : "Clique em 'Novo' para lançar"} colSpan={6} />}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Registro Financeiro</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="revenue">Receita</option><option value="expense">Despesa</option>
              </select>
            </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
            </div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── OS Detail Dialog ── */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detalhes da OS
            </DialogTitle>
          </DialogHeader>
          {detailDialog?.serviceOrder && (
            <div className="space-y-4 pt-1">
              {/* Client / Vehicle */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Cliente</p>
                  <p className="font-medium">{detailDialog.serviceOrder.client?.name || '-'}</p>
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

              {/* Services */}
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
                            <td className="px-3 py-2 text-right font-semibold">{fmt(s.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Items */}
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
                            <td className="px-3 py-2 text-right font-semibold">{fmt(i.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-muted/30 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total da OS</span>
                <span className="text-xl font-bold">{fmt(detailDialog.value)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
