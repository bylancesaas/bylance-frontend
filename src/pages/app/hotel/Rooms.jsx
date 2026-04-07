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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, DoorOpen, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_MAP = {
  available:   { label: 'Disponível',   variant: 'success' },
  occupied:    { label: 'Ocupado',      variant: 'destructive' },
  maintenance: { label: 'Manutenção',   variant: 'warning' },
  cleaning:    { label: 'Limpeza',      variant: 'info' },
};

const INITIAL = { number: '', floor: 1, roomTypeId: '', status: 'available', notes: '' };

export default function Rooms() {
  const [confirmModal, confirm] = useConfirm();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
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
      api.get('/rooms').then(r => setRooms(r.data.data || [])),
      api.get('/room-types').then(r => setRoomTypes(r.data.data || [])),
    ]).catch(() => toast.error('Erro ao carregar')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...INITIAL, roomTypeId: roomTypes[0]?.id || '' }); setDialogOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ number: r.number, floor: r.floor, roomTypeId: r.roomTypeId, status: r.status, notes: r.notes || '' }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, floor: parseInt(form.floor) };
    try {
      if (editing) { await api.put(`/rooms/${editing.id}`, payload); toast.success('Quarto atualizado'); }
      else { await api.post('/rooms', payload); toast.success('Quarto criado'); }
      setDialogOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await api.patch(`/rooms/${id}/status`, { status }); toast.success('Status atualizado'); load(); } catch { toast.error('Erro ao atualizar status'); }
  };

  const handleDelete = async (id, number) => {
    const ok = await confirm({
      title: 'Remover quarto',
      description: 'O quarto será removido permanentemente. Reservas vinculadas podem ser afetadas.',
      item: number ? `Quarto ${number}` : undefined,
      confirmLabel: 'Remover quarto',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingId(id);
    try { await api.delete(`/rooms/${id}`); toast.success('Removido'); load(); } catch { toast.error('Erro ao remover'); } finally { setDeletingId(null); }
  };

  const filtered = rooms.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    const q = search.toLowerCase();
    return !q || r.number.toLowerCase().includes(q) || r.roomType?.name?.toLowerCase().includes(q);
  });

  if (loading) return <LoadingSpinner />;

  // Grid view for rooms (visual map)
  const grouped = {};
  filtered.forEach(r => { const f = `Andar ${r.floor}`; (grouped[f] = grouped[f] || []).push(r); });

  return (
    <div className="animate-fade-in">
      {confirmModal}
      <PageHeader title="Quartos" description={`${rooms.length} quartos no total`}><Button onClick={openNew}><Plus className="w-4 h-4" /> Novo Quarto</Button></PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar quarto..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Room grid */}
      {Object.keys(grouped).length > 0 ? Object.entries(grouped).sort().map(([floor, rms]) => (
        <div key={floor} className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">{floor}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {rms.map(r => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.available;
              return (
                <div key={r.id} className="bg-card border rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow cursor-pointer group" onClick={() => openEdit(r)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold">{r.number}</span>
                    <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.roomType?.name || 'Sem tipo'}</p>
                  <div className="mt-3 flex gap-1">
                    {['available', 'occupied', 'cleaning', 'maintenance'].filter(s => s !== r.status).map(s => (
                      <button key={s} onClick={(e) => { e.stopPropagation(); handleStatusChange(r.id, s); }} className="text-[9px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 transition-colors" title={STATUS_MAP[s]?.label}>
                        {STATUS_MAP[s]?.label?.slice(0, 4)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )) : <EmptyState icon={DoorOpen} title="Nenhum quarto" description="Cadastre o primeiro quarto" />}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Quarto</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Número *</Label><Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} required placeholder="101" /></div>
              <div className="space-y-2"><Label>Andar</Label><Input type="number" min="0" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Tipo de quarto *</Label>
              <select value={form.roomTypeId} onChange={e => setForm(f => ({ ...f, roomTypeId: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">Selecione...</option>
                {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name} — R${t.basePrice.toFixed(2)}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end">
              {editing && <Button type="button" variant="destructive" disabled={deletingId === editing?.id} onClick={() => handleDelete(editing.id, editing?.number)} className="mr-auto">{deletingId === editing?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Excluir</Button>}
              <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
