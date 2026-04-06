import { useEffect, useState, useMemo } from 'react';
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
import { Plus, Pencil, Trash2, Shield, Printer, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';
import { printWarranty } from '@/utils/print';

const statusMap = { active: 'Ativa', expired: 'Expirada', claimed: 'Utilizada' };
const statusVariant = { active: 'success', expired: 'destructive', claimed: 'warning' };

export default function Warranties() {
  const { tenant } = useTenant();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [warranties, setWarranties] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ clientId: '', status: 'active', startDate: '', endDate: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    try {
      const [w, c] = await Promise.all([api.get('/warranties'), api.get('/clients')]);
      setWarranties(w.data.data || []); setClients(c.data.data || []);
    } catch { toast.error('Erro ao carregar garantias'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ clientId: '', status: 'active', startDate: '', endDate: '', description: '' }); setDialogOpen(true); };
  const openEdit = (w) => {
    setEditing(w);
    setForm({
      clientId: w.clientId, status: w.status,
      startDate: w.startDate?.substring(0, 10) || '',
      endDate: w.endDate?.substring(0, 10) || '',
      description: w.description || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() };
    setSaving(true);
    try {
      if (editing) { await api.put(`/warranties/${editing.id}`, data); toast.success('Garantia atualizada', { description: 'As alterações foram salvas.' }); }
      else { await api.post('/warranties', data); toast.success('Garantia cadastrada', { description: 'A garantia foi emitida.' }); }
      setDialogOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Não foi possível salvar a garantia'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover?')) return;
    setDeletingId(id);
    try { await api.delete(`/warranties/${id}`); toast.success('Garantia removida'); load(); } catch { toast.error('Erro ao remover garantia'); } finally { setDeletingId(null); }
  };

  if (loading) return <LoadingSpinner />;

  const filtered = warranties.filter(w => {
    if (filterStatus !== 'all' && w.status !== filterStatus) return false;
    if (search && !(w.client?.name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const hasFilters = search || filterStatus !== 'all';

  return (
    <div className="animate-fade-in">
      <PageHeader title="Garantias" description={`${warranties.length} garantias`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Nova</Button></PageHeader>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[150px]"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativa</option>
          <option value="expired">Expirada</option>
          <option value="claimed">Utilizada</option>
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterStatus('all'); }} className="gap-1 text-muted-foreground">
            <X className="w-3.5 h-3.5" /> Limpar
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(w => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.client?.name || '-'}</TableCell>
                <TableCell><Badge variant={statusVariant[w.status]}>{statusMap[w.status] || w.status}</Badge></TableCell>
                <TableCell>{w.startDate ? new Date(w.startDate).toLocaleDateString('pt-BR') : '-'}</TableCell>
                <TableCell>{w.endDate ? new Date(w.endDate).toLocaleDateString('pt-BR') : '-'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{w.description || '-'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" title="Imprimir garantia" onClick={() => printWarranty(w, tenant)}><Printer className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={deletingId === w.id} onClick={() => handleDelete(w.id)}>{deletingId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <EmptyState icon={Shield} title={hasFilters ? 'Nenhum resultado' : 'Nenhuma garantia'} description={hasFilters ? 'Ajuste os filtros' : "Clique em 'Nova' para cadastrar"} colSpan={6} />}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} Garantia</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} required>
                <option value="">Selecione...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Início</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Data Fim</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Ativa</option><option value="expired">Expirada</option><option value="claimed">Utilizada</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
