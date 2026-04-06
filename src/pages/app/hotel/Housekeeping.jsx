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
import { Plus, Pencil, Search, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_MAP = {
  pending:     { label: 'Pendente',    variant: 'warning' },
  in_progress: { label: 'Em andamento', variant: 'info' },
  completed:   { label: 'Concluído',   variant: 'success' },
  inspected:   { label: 'Inspecionado', variant: 'default' },
};

const PRIORITY_MAP = { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };
const TYPE_MAP = { checkout: 'Checkout', stay: 'Estadia', deep_clean: 'Limpeza profunda', maintenance: 'Manutenção' };

const INITIAL = { roomId: '', assignedTo: '', status: 'pending', priority: 'normal', type: 'checkout', notes: '', scheduledAt: '' };

export default function Housekeeping() {
  const [list, setList] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      api.get('/housekeeping').then(r => setList(r.data.data || [])),
      api.get('/rooms').then(r => setRooms(r.data.data || [])),
    ]).catch(() => toast.error('Erro ao carregar')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(INITIAL); setDialogOpen(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ roomId: t.roomId, assignedTo: t.assignedTo || '', status: t.status, priority: t.priority, type: t.type, notes: t.notes || '', scheduledAt: t.scheduledAt ? new Date(t.scheduledAt).toISOString().slice(0, 16) : '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null };
    try {
      if (editing) { await api.put(`/housekeeping/${editing.id}`, payload); toast.success('Tarefa atualizada'); }
      else { await api.post('/housekeeping', payload); toast.success('Tarefa criada'); }
      setDialogOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await api.patch(`/housekeeping/${id}/status`, { status }); toast.success('Status atualizado'); load(); } catch { toast.error('Erro ao atualizar'); }
  };

  const filtered = list.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    const q = search.toLowerCase();
    return !q || t.room?.number?.toLowerCase().includes(q) || (t.assignedTo || '').toLowerCase().includes(q);
  });

  const pending = list.filter(t => t.status === 'pending').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Governança" description={`${list.length} tarefas • ${pending} pendente${pending !== 1 ? 's' : ''}`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Nova Tarefa</Button></PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar quarto..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Quarto</TableHead><TableHead>Tipo</TableHead><TableHead>Prioridade</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(t => {
              const st = STATUS_MAP[t.status] || STATUS_MAP.pending;
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.room?.number || '-'} <span className="text-xs text-muted-foreground">({t.room?.roomType?.name})</span></TableCell>
                  <TableCell className="text-xs">{TYPE_MAP[t.type] || t.type}</TableCell>
                  <TableCell>
                    <Badge variant={t.priority === 'urgent' ? 'destructive' : t.priority === 'high' ? 'warning' : 'secondary'} className="text-[10px]">
                      {PRIORITY_MAP[t.priority] || t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.assignedTo || '-'}</TableCell>
                  <TableCell>
                    <select value={t.status} onChange={e => handleStatusChange(t.id, e.target.value)} className="h-7 rounded border border-input bg-background px-2 text-xs">
                      {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                    {t.status !== 'completed' && t.status !== 'inspected' && (
                      <Button variant="ghost" size="icon" onClick={() => handleStatusChange(t.id, 'completed')} title="Marcar como concluído"><CheckCircle2 className="w-4 h-4 text-green-600" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState icon={Sparkles} title="Nenhuma tarefa" description="Crie a primeira tarefa de governança" /></TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} Tarefa</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quarto *</Label>
                <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Selecione...</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.number} — {r.roomType?.name}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Tipo</Label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Prioridade</Label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Responsável</Label><Input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Nome do responsável" /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Agendado para</Label><Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Notas</Label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" /></div>
            </div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
