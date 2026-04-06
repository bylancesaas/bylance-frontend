import { useEffect, useState } from 'react';
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
import { Plus, Pencil, Trash2, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const INITIAL = { name: '', description: '', capacity: 2, basePrice: 0, amenities: '' };

export default function RoomTypes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => { api.get('/room-types').then(r => setList(r.data.data || [])).catch(() => toast.error('Erro ao carregar tipos')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(INITIAL); setDialogOpen(true); };
  const openEdit = (t) => { setEditing(t); setForm({ name: t.name, description: t.description || '', capacity: t.capacity, basePrice: t.basePrice, amenities: t.amenities || '' }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, capacity: parseInt(form.capacity), basePrice: parseFloat(form.basePrice) };
    try {
      if (editing) { await api.put(`/room-types/${editing.id}`, payload); toast.success('Tipo atualizado'); }
      else { await api.post('/room-types', payload); toast.success('Tipo criado'); }
      setDialogOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este tipo de quarto?')) return;
    setDeletingId(id);
    try { await api.delete(`/room-types/${id}`); toast.success('Removido'); load(); } catch { toast.error('Erro ao remover'); } finally { setDeletingId(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tipos de Quarto" description={`${list.length} tipos cadastrados`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Novo Tipo</Button></PageHeader>

      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Capacidade</TableHead><TableHead>Preço base</TableHead><TableHead>Quartos</TableHead><TableHead>Comodidades</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.capacity} pessoa{t.capacity > 1 ? 's' : ''}</TableCell>
                <TableCell>R$ {t.basePrice.toFixed(2)}</TableCell>
                <TableCell><Badge variant="secondary">{t._count?.rooms ?? 0}</Badge></TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">{t.amenities || '-'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={deletingId === t.id} onClick={() => handleDelete(t.id)}>{deletingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}</Button>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState icon={Layers} title="Nenhum tipo" description="Cadastre o primeiro tipo de quarto" /></TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Tipo de Quarto</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Standard, Luxo, Suíte" /></div>
            <div className="space-y-2"><Label>Descrição</Label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Capacidade</Label><Input type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Preço base (R$)</Label><Input type="number" min="0" step="0.01" value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Comodidades</Label><Input value={form.amenities} onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))} placeholder="Wi-Fi, TV, Ar-condicionado, Frigobar" /></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
