import { useEffect, useState, useMemo } from 'react';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, FileText, TrendingUp, CheckCircle, X, Wrench, ShoppingCart, Printer, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';
import { printServiceOrder } from '@/utils/print';

const statusMap = { pending: 'Pendente', in_progress: 'Em Andamento', completed: 'Concluída', cancelled: 'Cancelada' };
const statusVariant = { pending: 'warning', in_progress: 'default', completed: 'success', cancelled: 'destructive' };

const emptyForm = { clientId: '', vehicleId: '', description: '', status: 'pending', notes: '' };

export default function ServiceOrders() {
  const [activeTab, setActiveTab] = useState('orders');

  // ── Orders state ──
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedServices, setSelectedServices] = useState([]);
  const [addServiceId, setAddServiceId] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [addItemId, setAddItemId] = useState('');

  const { tenant } = useTenant();
  const [financialDialog, setFinancialDialog] = useState(null);
  const [searchOS, setSearchOS] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ── Services tab state ──
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: 0, estimatedTime: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState(null);

  const load = async () => {
    try {
      const [o, c, v, s, i] = await Promise.all([
        api.get('/service-orders'),
        api.get('/clients'),
        api.get('/vehicles').catch(() => ({ data: { data: [] } })),
        api.get('/services'),
        api.get('/items'),
      ]);
      setOrders(o.data.data || []);
      setClients(c.data.data || []);
      setAllVehicles(v.data.data || []);
      setAvailableServices(s.data.data || []);
      setAllItems(i.data.data || []);
    } catch { toast.error('Erro ao carregar'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const clientVehicles = useMemo(
    () => allVehicles.filter(v => v.clientId === form.clientId),
    [allVehicles, form.clientId]
  );

  const servicesTotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.total, 0),
    [selectedServices]
  );
  const itemsTotal = useMemo(
    () => selectedItems.reduce((sum, i) => sum + i.total, 0),
    [selectedItems]
  );
  const total = servicesTotal + itemsTotal;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedServices([]);
    setAddServiceId('');
    setSelectedItems([]);
    setAddItemId('');
    setDialogOpen(true);
  };

  const openEdit = (o) => {
    setEditing(o);
    setForm({ clientId: o.clientId, vehicleId: o.vehicleId || '', description: o.description || '', status: o.status, notes: o.notes || '' });
    setSelectedServices((o.services || []).map(s => ({
      serviceId: s.serviceId,
      serviceName: s.service?.name || '',
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      total: s.total,
    })));
    setSelectedItems((o.items || []).map(i => ({
      itemId: i.itemId,
      itemName: i.item?.name || '',
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })));
    setAddServiceId('');
    setAddItemId('');
    setDialogOpen(true);
  };

  const addService = () => {
    if (!addServiceId) return;
    const svc = availableServices.find(s => s.id === addServiceId);
    if (!svc) return;
    if (selectedServices.some(s => s.serviceId === addServiceId)) { toast.error('Serviço já adicionado'); return; }
    setSelectedServices(prev => [...prev, { serviceId: svc.id, serviceName: svc.name, quantity: 1, unitPrice: svc.price, total: svc.price }]);
    setAddServiceId('');
  };

  const removeService = (serviceId) => setSelectedServices(prev => prev.filter(s => s.serviceId !== serviceId));

  const updateServiceQty = (serviceId, qty) => {
    setSelectedServices(prev => prev.map(s => {
      if (s.serviceId !== serviceId) return s;
      const quantity = Math.max(1, parseInt(qty) || 1);
      return { ...s, quantity, total: quantity * s.unitPrice };
    }));
  };

  const updateServicePrice = (serviceId, price) => {
    setSelectedServices(prev => prev.map(s => {
      if (s.serviceId !== serviceId) return s;
      const unitPrice = parseFloat(price) || 0;
      return { ...s, unitPrice, total: s.quantity * unitPrice };
    }));
  };

  const addItem = () => {
    if (!addItemId) return;
    const itm = allItems.find(i => i.id === addItemId);
    if (!itm) return;
    if (selectedItems.some(i => i.itemId === addItemId)) { toast.error('Item já adicionado'); return; }
    setSelectedItems(prev => [...prev, { itemId: itm.id, itemName: itm.name, quantity: 1, unitPrice: itm.sellPrice, total: itm.sellPrice }]);
    setAddItemId('');
  };

  const removeItem = (itemId) => setSelectedItems(prev => prev.filter(i => i.itemId !== itemId));

  const updateItemQty = (itemId, qty) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.itemId !== itemId) return i;
      const quantity = Math.max(1, parseInt(qty) || 1);
      return { ...i, quantity, total: quantity * i.unitPrice };
    }));
  };

  const updateItemPrice = (itemId, price) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.itemId !== itemId) return i;
      const unitPrice = parseFloat(price) || 0;
      return { ...i, unitPrice, total: i.quantity * unitPrice };
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Selecione um cliente'); return; }
    const payload = {
      ...form,
      vehicleId: form.vehicleId || undefined,
      total,
      services: selectedServices.map(s => ({ serviceId: s.serviceId, quantity: s.quantity, unitPrice: s.unitPrice, total: s.total })),
      items: selectedItems.map(i => ({ itemId: i.itemId, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
    };
    setSaving(true);
    try {
      let orderId;
      if (editing) {
        await api.put(`/service-orders/${editing.id}`, payload);
        orderId = editing.id;
        toast.success('OS atualizada');
      } else {
        const res = await api.post('/service-orders', payload);
        orderId = res.data.data?.id;
        toast.success('OS criada');
      }
      setDialogOpen(false);
      load();
      // Prompt financial if completing with value and not yet sent
      const alreadySent = editing?.financials?.length > 0;
      if (form.status === 'completed' && total > 0 && !alreadySent && orderId) {
        const clientName = clients.find(c => c.id === form.clientId)?.name || '';
        setFinancialDialog({ orderId, total, clientName });
      }
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  };

  const sendToFinancial = async (orderId) => {
    setSavingFinancial(true);
    try {
      await api.post(`/service-orders/${orderId}/to-financial`);
      toast.success('Receita lançada no financeiro!');
      setFinancialDialog(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao lançar');
    } finally { setSavingFinancial(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover esta OS?')) return;
    setDeletingId(id);
    try { await api.delete(`/service-orders/${id}`); toast.success('Removido'); load(); } catch { toast.error('Erro'); } finally { setDeletingId(null); }
  };

  // ── Services tab handlers ──
  const openNewService = () => {
    setEditingService(null);
    setServiceForm({ name: '', description: '', price: 0, estimatedTime: '', category: '' });
    setServiceDialogOpen(true);
  };

  const openEditService = (s) => {
    setEditingService(s);
    setServiceForm({ name: s.name, description: s.description || '', price: s.price, estimatedTime: s.estimatedTime || '', category: s.category || '' });
    setServiceDialogOpen(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    const data = { ...serviceForm, price: parseFloat(serviceForm.price) };
    setSavingService(true);
    try {
      if (editingService) { await api.put(`/services/${editingService.id}`, data); toast.success('Serviço atualizado'); }
      else { await api.post('/services', data); toast.success('Serviço criado'); }
      setServiceDialogOpen(false);
      load();
    } catch { toast.error('Erro ao salvar'); } finally { setSavingService(false); }
  };

  const handleServiceDelete = async (id) => {
    if (!confirm('Remover este serviço?')) return;
    setDeletingServiceId(id);
    try { await api.delete(`/services/${id}`); toast.success('Removido'); load(); } catch { toast.error('Erro'); } finally { setDeletingServiceId(null); }
  };

  const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const autoTypes = ['auto', 'oficina'];
  const isAutoType = autoTypes.includes(tenant?.businessType);
  const vehicleLabel = isAutoType ? 'Veículo' : 'Referência';
  const showVehicleCol = isAutoType || orders.some(o => o.vehicle);

  const filteredOrders = useMemo(() => orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (searchOS) {
      const q = searchOS.toLowerCase();
      if (
        !(o.client?.name || '').toLowerCase().includes(q) &&
        !(o.description || '').toLowerCase().includes(q) &&
        !(o.vehicle?.plate || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [orders, filterStatus, searchOS]);

  const servicesNotAdded = availableServices.filter(s => !selectedServices.some(ss => ss.serviceId === s.id));
  const itemsNotAdded = allItems.filter(i => !selectedItems.some(si => si.itemId === i.id));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ordens de Serviço"
        description={activeTab === 'orders' ? `${orders.length} ordens` : `${availableServices.length} serviços cadastrados`}
      >
        {activeTab === 'orders'
          ? <Button onClick={openNew}><Plus className="w-4 h-4" /> Nova OS</Button>
          : <Button onClick={openNewService}><Plus className="w-4 h-4" /> Novo Serviço</Button>
        }
      </PageHeader>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {[
          { key: 'orders', label: 'Ordens de Serviço', icon: FileText },
          { key: 'services', label: 'Serviços', icon: Wrench },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <>
          {/* Filter bar */}
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={`Buscar cliente${showVehicleCol ? ', placa' : ''} ou descrição...`} className="pl-9" value={searchOS} onChange={e => setSearchOS(e.target.value)} />
            </div>
            <select
              className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </select>
            {(searchOS || filterStatus !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchOS(''); setFilterStatus('all'); }} className="gap-1 text-muted-foreground">
                <X className="w-3.5 h-3.5" /> Limpar
              </Button>
            )}
          </div>
          <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                {showVehicleCol && <TableHead>{vehicleLabel}</TableHead>}
                <TableHead>Serviços / Peças</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{o.client?.name || '-'}</TableCell>
                  {showVehicleCol && (
                    <TableCell className="text-sm text-muted-foreground">
                      {o.vehicle ? `${o.vehicle.brand || ''} ${o.vehicle.model || ''} — ${o.vehicle.plate}`.trim() : '-'}
                    </TableCell>
                  )}
                  <TableCell className="max-w-[170px]">
                    <div className="space-y-0.5">
                      {o.services?.length > 0 && (
                        <span className="text-xs text-muted-foreground truncate block">
                          <Wrench className="w-3 h-3 inline mr-1 opacity-50" />
                          {o.services.map(s => s.service?.name).join(', ')}
                        </span>
                      )}
                      {o.items?.length > 0 && (
                        <span className="text-xs text-muted-foreground truncate block">
                          <ShoppingCart className="w-3 h-3 inline mr-1 opacity-50" />
                          {o.items.map(i => i.item?.name).join(', ')}
                        </span>
                      )}
                      {!o.services?.length && !o.items?.length && (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={statusVariant[o.status]}>{statusMap[o.status] || o.status}</Badge></TableCell>
                  <TableCell className="font-semibold">{fmt(o.total)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {o.status === 'completed' && o.total > 0 && o.financials?.length === 0 && (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => setFinancialDialog({ orderId: o.id, total: o.total, clientName: o.client?.name || '' })}
                        >
                          <TrendingUp className="w-3 h-3" /> Financeiro
                        </Button>
                      )}
                      {o.financials?.length > 0 && (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="w-3 h-3" /> Lançado
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" title="Imprimir OS" onClick={() => printServiceOrder(o, tenant)}><Printer className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" disabled={deletingId === o.id} onClick={() => handleDelete(o.id)}>{deletingId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && <EmptyState icon={FileText} title={searchOS || filterStatus !== 'all' ? 'Nenhum resultado' : 'Nenhuma OS'} description={searchOS || filterStatus !== 'all' ? 'Ajuste os filtros' : "Clique em 'Nova OS' para criar"} colSpan={showVehicleCol ? 8 : 7} />}
            </TableBody>
          </Table>
          </div>
        </>
      )}

      {/* ── SERVICES TAB ── */}
      {activeTab === 'services' && (
        <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Tempo Est.</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableServices.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.category || '-'}</TableCell>
                  <TableCell>{fmt(s.price)}</TableCell>
                  <TableCell>{s.estimatedTime || '-'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditService(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={deletingServiceId === s.id} onClick={() => handleServiceDelete(s.id)}>{deletingServiceId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}</Button>
                  </TableCell>
                </TableRow>
              ))}
              {availableServices.length === 0 && <EmptyState icon={Wrench} title="Nenhum serviço" description="Clique em 'Novo Serviço' para cadastrar" colSpan={5} />}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── OS Form Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Nova'} Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-1">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value, vehicleId: '' }))} required>
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="pending">Pendente</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="completed">Concluída</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>

            {form.clientId && clientVehicles.length > 0 && (
              <div className="space-y-2">
                <Label>{vehicleLabel}</Label>
                <select value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}>
                  <option value="">Sem veículo</option>
                  {clientVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Serviços ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-muted-foreground" /> Serviços realizados
                </Label>
                {selectedServices.length > 0 && <span className="text-xs text-muted-foreground">{selectedServices.length} adicionado(s)</span>}
              </div>
              {servicesNotAdded.length > 0 && (
                <div className="flex gap-2">
                  <select className="flex-1" value={addServiceId} onChange={e => setAddServiceId(e.target.value)}>
                    <option value="">Adicionar serviço...</option>
                    {servicesNotAdded.map(s => <option key={s.id} value={s.id}>{s.name} — {fmt(s.price)}</option>)}
                  </select>
                  <Button type="button" variant="outline" onClick={addService} disabled={!addServiceId}><Plus className="w-4 h-4" /></Button>
                </div>
              )}
              {availableServices.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum serviço cadastrado. Use a aba <strong>Serviços</strong> para cadastrar.</p>
              )}
              {selectedServices.length > 0 ? (
                <div className="border rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Serviço</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Qtd</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Preço</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedServices.map(s => (
                        <tr key={s.serviceId} className="border-t">
                          <td className="px-3 py-2.5 font-medium">{s.serviceName}</td>
                          <td className="px-2 py-2.5"><Input type="number" min="1" value={s.quantity} onChange={e => updateServiceQty(s.serviceId, e.target.value)} className="h-8 w-16 text-center mx-auto" /></td>
                          <td className="px-2 py-2.5"><Input type="number" step="0.01" min="0" value={s.unitPrice} onChange={e => updateServicePrice(s.serviceId, e.target.value)} className="h-8 w-24 text-right ml-auto" /></td>
                          <td className="px-3 py-2.5 text-right font-semibold">{fmt(s.total)}</td>
                          <td className="px-2 py-2.5 text-center">
                            <button type="button" onClick={() => removeService(s.serviceId)} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-dashed rounded-xl py-6 text-center">
                  <p className="text-xs text-muted-foreground">Nenhum serviço adicionado</p>
                </div>
              )}
            </div>

            {/* ── Peças / Itens ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-muted-foreground" /> Peças / Produtos utilizados
                </Label>
                {selectedItems.length > 0 && <span className="text-xs text-muted-foreground">{selectedItems.length} adicionado(s)</span>}
              </div>
              {itemsNotAdded.length > 0 && (
                <div className="flex gap-2">
                  <select className="flex-1" value={addItemId} onChange={e => setAddItemId(e.target.value)}>
                    <option value="">Adicionar peça/produto do estoque...</option>
                    {itemsNotAdded.map(i => <option key={i.id} value={i.id}>{i.name} — {fmt(i.sellPrice)} (estoque: {i.stockQuantity})</option>)}
                  </select>
                  <Button type="button" variant="outline" onClick={addItem} disabled={!addItemId}><Plus className="w-4 h-4" /></Button>
                </div>
              )}
              {allItems.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum item no estoque. Cadastre em <strong>Estoque</strong>.</p>
              )}
              {selectedItems.length > 0 ? (
                <div className="border rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produto</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Qtd</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Preço</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map(i => (
                        <tr key={i.itemId} className="border-t">
                          <td className="px-3 py-2.5 font-medium">{i.itemName}</td>
                          <td className="px-2 py-2.5"><Input type="number" min="1" value={i.quantity} onChange={e => updateItemQty(i.itemId, e.target.value)} className="h-8 w-16 text-center mx-auto" /></td>
                          <td className="px-2 py-2.5"><Input type="number" step="0.01" min="0" value={i.unitPrice} onChange={e => updateItemPrice(i.itemId, e.target.value)} className="h-8 w-24 text-right ml-auto" /></td>
                          <td className="px-3 py-2.5 text-right font-semibold">{fmt(i.total)}</td>
                          <td className="px-2 py-2.5 text-center">
                            <button type="button" onClick={() => removeItem(i.itemId)} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-dashed rounded-xl py-6 text-center">
                  <p className="text-xs text-muted-foreground">Nenhum produto adicionado</p>
                </div>
              )}
            </div>

            {/* Total geral */}
            {(selectedServices.length > 0 || selectedItems.length > 0) && (
              <div className="bg-muted/30 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total da OS</span>
                <span className="text-xl font-bold text-foreground">{fmt(total)}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea placeholder="Descrição do problema..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-[72px]" />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea placeholder="Observações internas..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[72px]" />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1 border-t">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}Salvar OS</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Service Form Dialog ── */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingService ? 'Editar' : 'Novo'} Serviço</DialogTitle></DialogHeader>
          <form onSubmit={handleServiceSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Preço</Label><Input type="number" step="0.01" value={serviceForm.price} onChange={e => setServiceForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Tempo Estimado</Label><Input value={serviceForm.estimatedTime} onChange={e => setServiceForm(f => ({ ...f, estimatedTime: e.target.value }))} placeholder="ex: 2h" /></div>
            </div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={serviceForm.category} onChange={e => setServiceForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" disabled={savingService} onClick={() => setServiceDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingService}>{savingService && <Loader2 className="w-4 h-4 animate-spin" />}Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Financial Confirmation Dialog ── */}
      <Dialog open={!!financialDialog} onOpenChange={() => setFinancialDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Lançar no Financeiro?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deseja registrar{' '}
              <span className="font-semibold text-foreground">{fmt(financialDialog?.total)}</span>
              {financialDialog?.clientName && (
                <> de <span className="font-semibold text-foreground">{financialDialog.clientName}</span></>
              )}{' '}
              como receita no módulo financeiro?
            </p>
            <div className="flex gap-3">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" disabled={savingFinancial} onClick={() => sendToFinancial(financialDialog?.orderId)}>
                {savingFinancial ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />} Sim, lançar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setFinancialDialog(null)}>Agora não</Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Se não lançar agora, um botão ficará disponível na OS.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

