import { useEffect, useState } from 'react';
import { useConfirm } from '@/components/ConfirmModal';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Services() {
  const [confirmModal, confirm] = useConfirm();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: 0, estimatedTime: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => { api.get('/services').then(r => setServices(r.data.data || [])).catch(() => toast.error('Erro ao carregar serviços')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', description: '', price: 0, estimatedTime: '', category: '' }); setDialogOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, description: s.description || '', price: s.price, estimatedTime: s.estimatedTime || '', category: s.category || '' }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, price: parseFloat(form.price) };
    setSaving(true);
    try {
      if (editing) { await api.put(`/services/${editing.id}`, data); toast.success('Serviço atualizado', { description: 'As alterações foram salvas.' }); }
      else { await api.post('/services', data); toast.success('Serviço cadastrado', { description: 'O serviço foi adicionado ao catálogo.' }); }
      setDialogOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Não foi possível salvar o serviço'); } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Excluir serviço',
      description: 'O serviço será removido permanentemente do catálogo.',
      item: name,
      confirmLabel: 'Excluir serviço',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingId(id);
    try { await api.delete(`/services/${id}`); toast.success('Serviço removido'); load(); } catch { toast.error('Erro ao remover serviço'); } finally { setDeletingId(null); }
  };

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      {confirmModal}
      <PageHeader title="Serviços" description={`${services.length} serviços`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button></PageHeader>
      <div className="mb-4 relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por nome..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Preço</TableHead><TableHead>Tempo Est.</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.category || '-'}</TableCell>
                <TableCell>R$ {(s.price || 0).toFixed(2)}</TableCell>
                <TableCell>{s.estimatedTime || '-'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={deletingId === s.id} onClick={() => handleDelete(s.id, s.name)}>{deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <EmptyState icon={Wrench} title="Nenhum serviço" description="Clique em 'Novo' para cadastrar" colSpan={5} />}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Serviço</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Preço</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Tempo Estimado</Label><Input value={form.estimatedTime} onChange={e => setForm(f => ({ ...f, estimatedTime: e.target.value }))} placeholder="ex: 2h" /></div>
            </div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
