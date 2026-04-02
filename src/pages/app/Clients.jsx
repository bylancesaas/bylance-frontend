import { useEffect, useState } from 'react';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '', address: '' });

  const load = () => { api.get('/clients').then(r => setClients(r.data.data || [])).catch(() => toast.error('Erro')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', email: '', phone: '', document: '', address: '' }); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', document: c.document || '', address: c.address || '' }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/clients/${editing.id}`, form); toast.success('Atualizado'); }
      else { await api.post('/clients', form); toast.success('Criado'); }
      setDialogOpen(false); load();
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este cliente?')) return;
    try { await api.delete(`/clients/${id}`); toast.success('Removido'); load(); } catch { toast.error('Erro'); }
  };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.document || '').toLowerCase().includes(q);
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Clientes" description={`${clients.length} cadastrados`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button></PageHeader>

      <div className="mb-4 relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por nome..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Documento</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.email || '-'}</TableCell>
                <TableCell>{c.phone || '-'}</TableCell>
                <TableCell>{c.document || '-'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <EmptyState icon={Users} title="Nenhum cliente" description="Clique em 'Novo' para cadastrar" colSpan={5} />}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Documento (CPF/CNPJ)</Label><Input value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Endereço</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
