import { useEffect, useState } from 'react';
import { useConfirm } from '@/components/ConfirmModal';
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
import { Plus, Pencil, Trash2, Search, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_MAP = {
  confirmed:   { label: 'Confirmada',  variant: 'default' },
  checked_in:  { label: 'Check-in',    variant: 'success' },
  checked_out: { label: 'Check-out',   variant: 'secondary' },
  cancelled:   { label: 'Cancelada',   variant: 'destructive' },
  no_show:     { label: 'No-show',     variant: 'warning' },
};

const SOURCE_MAP = { direct: 'Direto', booking: 'Booking', airbnb: 'Airbnb', phone: 'Telefone', website: 'Website', other: 'Outro' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
const fmtMoney = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

const INITIAL = { guestId: '', roomId: '', checkIn: '', checkOut: '', status: 'confirmed', adults: 1, children: 0, totalPrice: 0, notes: '', source: 'direct' };

export default function Reservations() {
  const [confirmModal, confirm] = useConfirm();
  const [list, setList] = useState([]);
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    Promise.all([
      api.get('/reservations').then(r => setList(r.data.data || [])),
      api.get('/guests').then(r => setGuests(r.data.data || [])),
      api.get('/rooms').then(r => setRooms(r.data.data || [])),
    ]).catch(() => toast.error('Erro ao carregar')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(INITIAL); setDialogOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ guestId: r.guestId, roomId: r.roomId, checkIn: toDateInput(r.checkIn), checkOut: toDateInput(r.checkOut), status: r.status, adults: r.adults, children: r.children, totalPrice: r.totalPrice, notes: r.notes || '', source: r.source || 'direct' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      adults: parseInt(form.adults),
      children: parseInt(form.children),
      totalPrice: parseFloat(form.totalPrice),
      checkIn: new Date(form.checkIn + 'T14:00:00').toISOString(),
      checkOut: new Date(form.checkOut + 'T12:00:00').toISOString(),
    };
    try {
      if (editing) { await api.put(`/reservations/${editing.id}`, payload); toast.success('Reserva atualizada'); }
      else { await api.post('/reservations', payload); toast.success('Reserva criada'); }
      setDialogOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await api.patch(`/reservations/${id}/status`, { status }); toast.success('Status atualizado'); load(); } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async (id, label) => {
    const ok = await confirm({
      title: 'Remover reserva',
      description: 'A reserva será removida permanentemente e não pode ser desfeita.',
      item: label,
      confirmLabel: 'Remover reserva',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingId(id);
    try { await api.delete(`/reservations/${id}`); toast.success('Removida'); load(); } catch { toast.error('Erro ao remover'); } finally { setDeletingId(null); }
  };

  const filtered = list.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    const q = search.toLowerCase();
    return !q || r.guest?.name?.toLowerCase().includes(q) || r.room?.number?.toLowerCase().includes(q);
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      {confirmModal}
      <PageHeader title="Reservas" description={`${list.length} reservas`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Nova Reserva</Button></PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar hóspede ou quarto..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Hóspede</TableHead><TableHead>Quarto</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Valor</TableHead><TableHead>Origem</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(r => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.confirmed;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.guest?.name || '-'}</TableCell>
                  <TableCell>{r.room?.number || '-'} <span className="text-xs text-muted-foreground">({r.room?.roomType?.name})</span></TableCell>
                  <TableCell>{fmtDate(r.checkIn)}</TableCell>
                  <TableCell>{fmtDate(r.checkOut)}</TableCell>
                  <TableCell>{fmtMoney(r.totalPrice)}</TableCell>
                  <TableCell className="text-xs">{SOURCE_MAP[r.source] || r.source}</TableCell>
                  <TableCell>
                    <select value={r.status} onChange={e => handleStatusChange(r.id, e.target.value)} className="h-7 rounded border border-input bg-background px-2 text-xs">
                      {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={deletingId === r.id} onClick={() => handleDelete(r.id, r.guest?.name ? `${r.guest.name} — Quarto ${r.room?.number}` : `Quarto ${r.room?.number}`)}>{deletingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8}><EmptyState icon={CalendarDays} title="Nenhuma reserva" description="Crie a primeira reserva" /></TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} Reserva</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Hóspede *</Label>
                <select value={form.guestId} onChange={e => setForm(f => ({ ...f, guestId: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Selecione...</option>
                  {guests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Quarto *</Label>
                <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Selecione...</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.number} — {r.roomType?.name}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Check-in *</Label><Input type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Check-out *</Label><Input type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Adultos</Label><Input type="number" min="1" value={form.adults} onChange={e => setForm(f => ({ ...f, adults: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Crianças</Label><Input type="number" min="0" value={form.children} onChange={e => setForm(f => ({ ...f, children: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Valor total (R$)</Label><Input type="number" min="0" step="0.01" value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Origem</Label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Object.entries(SOURCE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2"><Label>Observações</Label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" /></div>
            </div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
