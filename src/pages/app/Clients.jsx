import { useEffect, useState, useCallback } from 'react';
import { useConfirm } from '@/components/ConfirmModal';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
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
import {
  Plus, Pencil, Trash2, Search, Users, Loader2, Eye,
  X, Phone, Mail, FileText, MapPin, AlertCircle,
  User2, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Brazilian states ──────────────────────────────────────────────────────────
const BR_STATES = [
  { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' }, { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' }, { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' }, { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' }, { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' },
];

const EMPTY_ADDR = { cep: '', state: '', city: '', street: '', number: '', complement: '', neighborhood: '', reference: '' };

// ── Mask functions ────────────────────────────────────────────────────────────
const maskCPF = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const maskCNPJ = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const maskPhone = (v, type) => {
  const d = v.replace(/\D/g, '');
  if (type === 'celular') {
    const c = d.slice(0, 11);
    if (c.length === 0) return '';
    if (c.length <= 2) return `(${c}`;
    if (c.length <= 7) return `(${c.slice(0, 2)}) ${c.slice(2)}`;
    return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
  } else {
    const c = d.slice(0, 10);
    if (c.length === 0) return '';
    if (c.length <= 2) return `(${c}`;
    if (c.length <= 6) return `(${c.slice(0, 2)}) ${c.slice(2)}`;
    return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`;
  }
};

const maskCEP = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
};

// ── Validators ────────────────────────────────────────────────────────────────
function validateCPF(cpf) {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const calc = (base) => {
    let sum = 0;
    for (let i = 0; i < base; i++) sum += parseInt(n[i]) * (base + 1 - i);
    const rest = (sum * 10) % 11;
    return rest >= 10 ? 0 : rest;
  };
  return calc(9) === parseInt(n[9]) && calc(10) === parseInt(n[10]);
}

function validateCNPJ(cnpj) {
  const n = cnpj.replace(/\D/g, '');
  if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false;
  const nums = n.split('').map(Number);
  const calcD = (slice, weights) => {
    const sum = slice.reduce((acc, num, i) => acc + num * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return (
    calcD(nums.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === nums[12] &&
    calcD(nums.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === nums[13]
  );
}

const validateEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ── Address helpers ───────────────────────────────────────────────────────────
function parseAddr(raw) {
  if (!raw) return EMPTY_ADDR;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object') return { ...EMPTY_ADDR, ...p };
  } catch { /* legacy string */ }
  return { ...EMPTY_ADDR, street: raw };
}

function composeAddr(addr) {
  const hasData = Object.values(addr).some(v => String(v).trim());
  return hasData ? JSON.stringify(addr) : '';
}

// ── Document type detection ───────────────────────────────────────────────────
function getDocType(doc) {
  if (!doc) return null;
  const d = doc.replace(/\D/g, '');
  if (d.length === 11) return 'CPF';
  if (d.length === 14) return 'CNPJ';
  return null;
}

function getPhoneType(phone) {
  if (!phone) return 'celular';
  return phone.replace(/\D/g, '').length <= 10 ? 'fixo' : 'celular';
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tip({ children, label }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={6}
          className="z-[100] rounded-md bg-popover border border-border text-popover-foreground shadow-elevated px-2 py-1 text-xs select-none"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// ── Field error ───────────────────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

// ── Form section header ───────────────────────────────────────────────────────
function FormSection({ icon: Icon, title, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1.5 border-b border-border">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Type toggle (CPF/CNPJ, Celular/Fixo) ─────────────────────────────────────
function TypeToggle({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-lg border border-input bg-muted/40 p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
            value === opt.value
              ? 'bg-card shadow-soft text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Client view drawer (slide in from right) ──────────────────────────────────
function ClientViewDrawer({ client, open, onClose, onEdit }) {
  if (!client) return null;
  const docType = getDocType(client.document);

  let parsedAddr = null;
  try { parsedAddr = JSON.parse(client.address); } catch { /* legacy */ }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col sm:w-[400px]',
          'bg-card border-l border-border shadow-overlay',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Drawer header */}
        <div className="flex items-start gap-4 px-6 py-5 border-b border-border flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {client.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-foreground leading-tight truncate">{client.name}</h2>
            {docType && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={docType === 'CPF' ? 'info' : 'default'} className="text-2xs">{docType}</Badge>
                <span className="text-xs text-muted-foreground font-mono">{client.document}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</p>
            {client.email ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xs text-muted-foreground">E-mail</p>
                  <p className="text-sm font-medium">{client.email}</p>
                </div>
              </div>
            ) : null}
            {client.phone ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xs text-muted-foreground">
                    {getPhoneType(client.phone) === 'celular' ? 'Celular' : 'Telefone fixo'}
                  </p>
                  <p className="text-sm font-medium">{client.phone}</p>
                </div>
              </div>
            ) : null}
            {!client.email && !client.phone && (
              <p className="text-sm text-muted-foreground italic">Nenhum contato cadastrado</p>
            )}
          </div>

          {/* Address */}
          {client.address && (
            <div className="space-y-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</p>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-amber-600" />
                </div>
                <div className="space-y-0.5 text-sm">
                  {parsedAddr ? (
                    <>
                      {parsedAddr.street && (
                        <p className="font-medium">
                          {parsedAddr.street}{parsedAddr.number ? `, ${parsedAddr.number}` : ''}
                        </p>
                      )}
                      {parsedAddr.complement && <p className="text-muted-foreground">{parsedAddr.complement}</p>}
                      {parsedAddr.neighborhood && <p className="text-muted-foreground">{parsedAddr.neighborhood}</p>}
                      {(parsedAddr.city || parsedAddr.state) && (
                        <p className="text-muted-foreground">
                          {[parsedAddr.city, parsedAddr.state].filter(Boolean).join(' - ')}
                          {parsedAddr.cep && ` · CEP ${parsedAddr.cep}`}
                        </p>
                      )}
                      {parsedAddr.reference && (
                        <p className="text-xs text-muted-foreground italic mt-1">Ref: {parsedAddr.reference}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">{client.address}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {client._count?.serviceOrders > 0 && (
            <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Ordens de serviço</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{client._count.serviceOrders}</p>
            </div>
          )}

          {/* Meta */}
          {client.createdAt && (
            <p className="text-xs text-muted-foreground">
              Cadastrado em{' '}
              {new Date(client.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// ── Client form dialog ────────────────────────────────────────────────────────
function ClientForm({ open, onOpenChange, editing, onSaved }) {
  const [docType, setDocType] = useState('cpf');
  const [phoneType, setPhoneType] = useState('celular');
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '' });
  const [addr, setAddr] = useState(EMPTY_ADDR);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  // Populate when editing
  useEffect(() => {
    if (!open) return;
    if (editing) {
      const dType = editing.document?.replace(/\D/g, '').length === 14 ? 'cnpj' : 'cpf';
      setDocType(dType);
      setPhoneType(getPhoneType(editing.phone));
      setForm({
        name: editing.name || '',
        email: editing.email || '',
        phone: editing.phone || '',
        document: editing.document || '',
      });
      setAddr(parseAddr(editing.address));
    } else {
      setDocType('cpf');
      setPhoneType('celular');
      setForm({ name: '', email: '', phone: '', document: '' });
      setAddr(EMPTY_ADDR);
    }
    setErrors({});
  }, [open, editing]);

  // Load cities via IBGE when state changes
  useEffect(() => {
    if (!addr.state) { setCities([]); return; }
    setLoadingCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${addr.state}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then(data => setCities(Array.isArray(data) ? data.map(m => m.nome) : []))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, [addr.state]);

  // ViaCEP lookup
  const lookupCep = async (cep) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await r.json();
      if (!data.erro) {
        setAddr(f => ({
          ...f,
          street: data.logradouro || f.street,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          state: data.uf || f.state,
        }));
      }
    } catch { /* noop */ }
    setLoadingCep(false);
  };

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setA = (key, val) => setAddr(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório';
    if (form.email && !validateEmail(form.email)) e.email = 'E-mail inválido';
    if (form.document) {
      if (docType === 'cpf' && !validateCPF(form.document)) e.document = 'CPF inválido';
      if (docType === 'cnpj' && !validateCNPJ(form.document)) e.document = 'CNPJ inválido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, address: composeAddr(addr) };
      if (editing) {
        await api.put(`/clients/${editing.id}`, payload);
        toast.success('Cliente atualizado', { description: 'Os dados foram salvos.' });
      } else {
        await api.post('/clients', payload);
        toast.success('Cliente cadastrado', { description: 'Cadastro adicionado à lista.' });
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Não foi possível salvar o cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92dvh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-lg font-bold">
            {editing ? 'Editar cliente' : 'Novo cliente'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {editing
              ? 'Atualize os dados do cadastro'
              : 'Preencha os dados para cadastrar um novo cliente'}
          </p>
        </DialogHeader>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* ── Identificação ── */}
            <FormSection icon={User2} title="Identificação">
              <div className="space-y-1.5">
                <Label>Nome completo / Razão social <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setF('name', e.target.value)}
                  placeholder="Ex.: João da Silva ou Empresa Ltda."
                  className={errors.name ? 'border-destructive focus-visible:ring-destructive/40' : ''}
                />
                <FieldError msg={errors.name} />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de documento</Label>
                <TypeToggle
                  value={docType}
                  onChange={v => { setDocType(v); setF('document', ''); }}
                  options={[
                    { label: 'CPF — Pessoa física', value: 'cpf' },
                    { label: 'CNPJ — Pessoa jurídica', value: 'cnpj' },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{docType === 'cpf' ? 'CPF' : 'CNPJ'}</Label>
                <Input
                  value={form.document}
                  onChange={e => {
                    const v = docType === 'cpf' ? maskCPF(e.target.value) : maskCNPJ(e.target.value);
                    setF('document', v);
                  }}
                  placeholder={docType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  inputMode="numeric"
                  className={errors.document ? 'border-destructive focus-visible:ring-destructive/40' : ''}
                />
                <FieldError msg={errors.document} />
              </div>
            </FormSection>

            {/* ── Contato ── */}
            <FormSection icon={Phone} title="Contato">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  value={form.email}
                  onChange={e => setF('email', e.target.value)}
                  placeholder="cliente@email.com"
                  inputMode="email"
                  className={errors.email ? 'border-destructive focus-visible:ring-destructive/40' : ''}
                />
                <FieldError msg={errors.email} />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de telefone</Label>
                <TypeToggle
                  value={phoneType}
                  onChange={v => { setPhoneType(v); setF('phone', ''); }}
                  options={[
                    { label: 'Celular', value: 'celular' },
                    { label: 'Telefone fixo', value: 'fixo' },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input
                  value={form.phone}
                  onChange={e => setF('phone', maskPhone(e.target.value, phoneType))}
                  placeholder={phoneType === 'celular' ? '(00) 00000-0000' : '(00) 0000-0000'}
                  inputMode="tel"
                />
              </div>
            </FormSection>

            {/* ── Endereço ── */}
            <FormSection icon={MapPin} title="Endereço (opcional)">
              {/* CEP + State */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input
                      value={addr.cep}
                      onChange={e => {
                        const v = maskCEP(e.target.value);
                        setA('cep', v);
                        if (v.replace(/\D/g, '').length === 8) lookupCep(v);
                      }}
                      placeholder="00000-000"
                      inputMode="numeric"
                    />
                    {loadingCep && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <select
                    value={addr.state}
                    onChange={e => { setA('state', e.target.value); setA('city', ''); }}
                  >
                    <option value="">Selecione...</option>
                    {BR_STATES.map(s => (
                      <option key={s.uf} value={s.uf}>{s.name} ({s.uf})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                {cities.length > 0 ? (
                  <select
                    value={addr.city}
                    onChange={e => setA('city', e.target.value)}
                    disabled={loadingCities}
                  >
                    <option value="">{loadingCities ? 'Carregando cidades...' : 'Selecione a cidade...'}</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <Input
                    value={addr.city}
                    onChange={e => setA('city', e.target.value)}
                    placeholder={addr.state && loadingCities ? 'Carregando cidades...' : 'Selecione o estado primeiro'}
                    disabled={!!addr.state && loadingCities}
                  />
                )}
              </div>

              {/* Street + Number */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Logradouro / Rua</Label>
                  <Input
                    value={addr.street}
                    onChange={e => setA('street', e.target.value)}
                    placeholder="Av. das Flores"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input
                    value={addr.number}
                    onChange={e => setA('number', e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>

              {/* Neighborhood + Complement */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input
                    value={addr.neighborhood}
                    onChange={e => setA('neighborhood', e.target.value)}
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Complemento</Label>
                  <Input
                    value={addr.complement}
                    onChange={e => setA('complement', e.target.value)}
                    placeholder="Apto 12, Sala 3..."
                  />
                </div>
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <Label>Ponto de referência</Label>
                <Input
                  value={addr.reference}
                  onChange={e => setA('reference', e.target.value)}
                  placeholder="Próximo ao mercado, ao lado da farmácia..."
                />
              </div>
            </FormSection>

          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end px-6 py-4 border-t border-border flex-shrink-0 bg-card">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Salvando...</>
                : editing ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Clients() {  const [confirmModal, confirm] = useConfirm();  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    api.get('/clients')
      .then(r => setClients(r.data.data || []))
      .catch(() => toast.error('Erro ao carregar clientes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c) => { setEditing(c); setViewing(null); setFormOpen(true); };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Excluir cliente',
      description: 'O cliente e seus dados serão removidos permanentemente.',
      item: name,
      confirmLabel: 'Excluir cliente',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Cliente removido');
      setViewing(v => (v?.id === id ? null : v));
      load();
    } catch {
      toast.error('Erro ao remover cliente');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const qDigits = q.replace(/\D/g, '');
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.document || '').toLowerCase().includes(q) ||
      (qDigits && (c.document || '').replace(/\D/g, '').includes(qDigits)) ||
      (c.address || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner />;

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <div className="animate-fade-in">
        {confirmModal}
        <PageHeader
          title="Clientes"
          description={`${clients.length} cadastrado${clients.length !== 1 ? 's' : ''}`}
        >
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Novo cliente
          </Button>
        </PageHeader>

        {/* Search */}
        <div className="mb-5 relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, telefone, CPF, CNPJ, e-mail..."
            className="pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead className="text-right w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const docType = getDocType(c.document);
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors group"
                    onClick={() => setViewing(c)}
                  >
                    {/* Name */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {c.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground leading-tight">{c.name}</p>
                          {c._count?.serviceOrders > 0 && (
                            <p className="text-2xs text-muted-foreground">
                              {c._count.serviceOrders} OS
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Document with badge */}
                    <TableCell>
                      {c.document ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {docType && (
                            <Badge
                              variant={docType === 'CPF' ? 'info' : 'default'}
                              className="text-2xs flex-shrink-0"
                            >
                              {docType}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground font-mono">{c.document}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {c.email || '—'}
                    </TableCell>

                    {/* Phone */}
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {c.phone || '—'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell
                      className="text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        <Tip label="Visualizar">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setViewing(c)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Tip>
                        <Tip label="Editar">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Tip>
                        <Tip label="Remover">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={deletingId === c.id}
                            onClick={() => handleDelete(c.id, c.name)}
                          >
                            {deletingId === c.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </Tip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <EmptyState
                  icon={Users}
                  title={search ? 'Nenhum resultado' : 'Nenhum cliente'}
                  description={
                    search
                      ? `Nenhum cliente encontrado para "${search}"`
                      : "Clique em 'Novo cliente' para começar"
                  }
                  colSpan={5}
                />
              )}
            </TableBody>
          </Table>
        </div>

        {/* Form dialog */}
        <ClientForm
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          onSaved={load}
        />

        {/* View drawer */}
        <ClientViewDrawer
          client={viewing}
          open={!!viewing}
          onClose={() => setViewing(null)}
          onEdit={() => openEdit(viewing)}
        />
      </div>
    </TooltipPrimitive.Provider>
  );
}



