import { useEffect, useState, useMemo } from 'react';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Package, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function Items() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', costPrice: 0, sellPrice: 0, stockQuantity: 0, category: '' });

  const load = () => { api.get('/items').then(r => setItems(r.data.data || [])).catch(() => toast.error('Erro')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', description: '', costPrice: 0, sellPrice: 0, stockQuantity: 0, category: '' }); setDialogOpen(true); };
  const openEdit = (i) => { setEditing(i); setForm({ name: i.name, description: i.description || '', costPrice: i.costPrice, sellPrice: i.sellPrice, stockQuantity: i.stockQuantity, category: i.category || '' }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, costPrice: parseFloat(form.costPrice), sellPrice: parseFloat(form.sellPrice), stockQuantity: parseInt(form.stockQuantity) };
    try {
      if (editing) { await api.put(`/items/${editing.id}`, data); toast.success('Atualizado'); }
      else { await api.post('/items', data); toast.success('Criado'); }
      setDialogOpen(false); load();
    } catch { toast.error('Erro'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover?')) return;
    try { await api.delete(`/items/${id}`); toast.success('Removido'); load(); } catch { toast.error('Erro'); }
  };

  const filtered = useMemo(() => items.filter(i => {
    if (filterCategory !== 'all' && (i.category || '') !== filterCategory) return false;
    if (filterLowStock && i.stockQuantity > 5) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search, filterCategory, filterLowStock]);
  const categories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))], [items]);
  const hasFilters = search || filterCategory !== 'all' || filterLowStock;
  const fmt = (v) => `R$ ${(v || 0).toFixed(2)}`;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Estoque" description={`${items.length} itens`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Novo Item</Button></PageHeader>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {categories.length > 0 && (
          <select
            className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[150px]"
            value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button
          onClick={() => setFilterLowStock(v => !v)}
          className={`flex items-center gap-1.5 h-10 px-3 rounded-md border text-sm font-medium transition-colors ${
            filterLowStock ? 'bg-amber-100 border-amber-300 text-amber-800' : 'border-input bg-background text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Estoque baixo (≤5)
        </button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterCategory('all'); setFilterLowStock(false); }} className="gap-1 text-muted-foreground">
            <X className="w-3.5 h-3.5" /> Limpar
          </Button>
        )}
      </div>
      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Custo</TableHead><TableHead>Venda</TableHead><TableHead>Estoque</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell>{i.category || '-'}</TableCell>
                <TableCell>{fmt(i.costPrice)}</TableCell>
                <TableCell>{fmt(i.sellPrice)}</TableCell>
                <TableCell>{i.stockQuantity}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <EmptyState icon={Package} title={hasFilters ? 'Nenhum resultado' : 'Nenhum item'} description={hasFilters ? 'Ajuste os filtros' : "Clique em 'Novo' para cadastrar"} colSpan={6} />}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Item</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Custo</Label><Input type="number" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Venda</Label><Input type="number" step="0.01" value={form.sellPrice} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Estoque</Label><Input type="number" value={form.stockQuantity} onChange={e => setForm(f => ({ ...f, stockQuantity: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
