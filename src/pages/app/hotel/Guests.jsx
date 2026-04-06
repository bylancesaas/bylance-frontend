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
import { Plus, Pencil, Trash2, Search, User, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';

const INITIAL = { name: '', email: '', phone: '', document: '', documentType: 'cpf', nationality: 'BR', address: '', notes: '', vip: false };

export default function Guests() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => { api.get('/guests').then(r => setList(r.data.data || [])).catch(() => toast.error('Erro ao carregar hóspedes')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(INITIAL); setDialogOpen(true); };
  const openEdit = (g) => { setEditing(g); setForm({ name: g.name, email: g.email || '', phone: g.phone || '', document: g.document || '', documentType: g.documentType || 'cpf', nationality: g.nationality || 'BR', address: g.address || '', notes: g.notes || '', vip: g.vip || false }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await api.put(`/guests/${editing.id}`, form); toast.success('Hóspede atualizado'); }
      else { await api.post('/guests', form); toast.success('Hóspede cadastrado'); }
      setDialogOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este hóspede?')) return;
    setDeletingId(id);
    try { await api.delete(`/guests/${id}`); toast.success('Hóspede removido'); load(); } catch { toast.error('Erro ao remover'); } finally { setDeletingId(null); }
  };

  const filtered = list.filter(g => {
    const q = search.toLowerCase();
    return !q || g.name.toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q) || (g.document || '').toLowerCase().includes(q) || (g.phone || '').includes(q);
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Hóspedes" description={`${list.length} cadastrados`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button></PageHeader>
      <div className="mb-4 relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por nome, documento..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Documento</TableHead><TableHead>Telefone</TableHead><TableHead>Email</TableHead><TableHead>Reservas</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(g => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-1.5">{g.name}{g.vip && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}</span>
                </TableCell>
                <TableCell>{g.document || '-'}</TableCell>
                <TableCell>{g.phone || '-'}</TableCell>
                <TableCell>{g.email || '-'}</TableCell>
                <TableCell><Badge variant="secondary">{g._count?.reservations ?? 0}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={deletingId === g.id} onClick={() => handleDelete(g.id)}>{deletingId === g.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState icon={User} title="Nenhum hóspede" description="Cadastre o primeiro hóspede" /></TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Hóspede</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2"><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Documento</Label><Input value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} placeholder="CPF / Passaporte" /></div>
              <div className="space-y-2"><Label>Tipo</Label>
                <select value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="cpf">CPF</option><option value="rg">RG</option><option value="passport">Passaporte</option><option value="other">Outro</option>
                </select>
              </div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Nacionalidade</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Endereço</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Observações</Label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.vip} onChange={e => setForm(f => ({ ...f, vip: e.target.checked }))} className="w-4 h-4 rounded accent-primary" /><span className="text-sm font-medium flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" />Hóspede VIP</span></label>
            </div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
