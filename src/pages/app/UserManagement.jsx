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
import { Plus, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const roleMap = { director: 'Diretor', assistant: 'Assistente', mechanic: 'Técnico' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'mechanic' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => { api.get('/users').then(r => setUsers(r.data.data || [])).catch(() => toast.error('Erro ao carregar usuários')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'mechanic' }); setDialogOpen(true); };
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form };
    if (editing && !data.password) delete data.password;
    setSaving(true);
    try {
      if (editing) { await api.put(`/users/${editing.id}`, data); toast.success('Usuário atualizado', { description: 'Os dados foram salvos.' }); }
      else { await api.post('/users', data); toast.success('Usuário criado', { description: 'O acesso foi configurado.' }); }
      setDialogOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Não foi possível salvar o usuário'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este usuário?')) return;
    setDeletingId(id);
    try { await api.delete(`/users/${id}`); toast.success('Usuário removido'); load(); } catch { toast.error('Erro ao remover usuário'); } finally { setDeletingId(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Gestão de Usuários" description={`${users.length} usuários`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button></PageHeader>
      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Cargo</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><Badge variant="secondary">{roleMap[u.role] || u.role}</Badge></TableCell>
                <TableCell><Badge variant={u.active ? 'success' : 'destructive'}>{u.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={deletingId === u.id} onClick={() => handleDelete(u.id)}>{deletingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}</Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && <EmptyState icon={Users} title="Nenhum usuário" description="Clique em 'Novo' para cadastrar" colSpan={5} />}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Usuário</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>{editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} {...(!editing && { required: true })} /></div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="director">Diretor</option><option value="assistant">Assistente</option><option value="mechanic">Técnico</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
