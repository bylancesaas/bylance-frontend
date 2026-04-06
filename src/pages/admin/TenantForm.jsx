import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Upload, X, LayoutDashboard, Users, Package, FileText, Shield,
  DollarSign, LogOut, Building2, MapPin, User, CreditCard,
  Paintbrush, KeyRound, ClipboardCheck, ChevronRight, ChevronLeft,
  Check, Loader2, Eye, EyeOff, AlertCircle, Lock,
  Copy, RefreshCw, Wand2, Sparkles,
} from 'lucide-react';

// ── Validators ────────────────────────────────────────────────────────────────
function validateCNPJ(raw) {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (digits, len) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) { sum += +digits[len - i] * pos--; if (pos < 2) pos = 9; }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  return calc(d, 12) === +d[12] && calc(d, 13) === +d[13];
}
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtCNPJ = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2}).*/, '$1.$2.$3/$4-$5')
    .replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, '$1.$2.$3/$4')
    .replace(/^(\d{2})(\d{3})(\d{1,3})$/, '$1.$2.$3')
    .replace(/^(\d{2})(\d{1,3})$/, '$1.$2');
};
const fmtPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
};
const fmtCEP = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_MODULES = [
  { key: 'dashboard',      label: 'Dashboard',          icon: LayoutDashboard },
  { key: 'clients',        label: 'Clientes',           icon: Users },
  { key: 'items',          label: 'Peças & Itens',      icon: Package },
  { key: 'services',       label: 'Serviços',           icon: FileText },
  { key: 'serviceOrders',  label: 'Ordens de Serviço',  icon: FileText },
  { key: 'warranties',     label: 'Garantias',          icon: Shield },
  { key: 'financial',      label: 'Financeiro',         icon: DollarSign },
  { key: 'userManagement', label: 'Gestão de Usuários', icon: Users },
];

const BUSINESS_TYPES = [
  { value: 'mecanica',        label: 'Mecânica Geral' },
  { value: 'eletrica',        label: 'Elétrica Automotiva' },
  { value: 'ar_condicionado', label: 'Ar-Condicionado' },
  { value: 'funilaria',       label: 'Funilaria e Pintura' },
  { value: 'refrigeracao',    label: 'Refrigeração' },
  { value: 'oficina',         label: 'Oficina Multi-Serviço' },
  { value: 'geral',           label: 'Geral / Outro' },
];

const PORTES = [
  { value: 'mei',     label: 'MEI' },
  { value: 'pequena', label: 'Pequena Empresa' },
  { value: 'media',   label: 'Média Empresa' },
  { value: 'grande',  label: 'Grande Empresa' },
];

const PLANS = [
  { value: 'basic',      label: 'Básico',    desc: 'Até 5 usuários, módulos essenciais' },
  { value: 'pro',        label: 'Pro',       desc: 'Até 20 usuários, todos os módulos' },
  { value: 'enterprise', label: 'Enterprise', desc: 'Usuários ilimitados, suporte dedicado' },
];

const PLAN_STATUSES = [
  { value: 'ativo',     label: 'Ativo' },
  { value: 'trial',     label: 'Trial' },
  { value: 'suspenso',  label: 'Suspenso' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'cortesia',  label: 'Cortesia' },
];

const BILLING_TYPES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'annual',  label: 'Anual' },
  { value: 'avulso',  label: 'Avulso' },
];

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const PREVIEW_NAV = [
  { label: 'Home',              icon: LayoutDashboard },
  { label: 'Clientes',          icon: Users },
  { label: 'Estoque',           icon: Package },
  { label: 'OS',                icon: FileText },
  { label: 'Garantias',         icon: Shield },
  { label: 'Financeiro',        icon: DollarSign },
];

const INITIAL_FORM = {
  name: '', razaoSocial: '', cnpj: '', inscricaoEstadual: '', inscricaoMunicipal: '',
  businessType: '', porte: '', site: '', slug: '', active: true, telefone: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  responsavelNome: '', responsavelEmail: '', responsavelTelefone: '', responsavelCargo: '',
  plan: 'basic', planStatus: 'ativo', planValue: '', planBillingType: 'monthly',
  planStartDate: '', planEndDate: '', planNotes: '', maxUsers: 10,
  primaryColor: '#1e40af', secondaryColor: '#3b82f6', iconBgColor: '#ffffff', logo: '',
};

const DRAFT_KEY = 'bylance-tenant-draft-new';

// ── Small UI helpers ───────────────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p role="alert" className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
      <AlertCircle className="w-3 h-3 shrink-0" />{msg}
    </p>
  );
}

function Field({ label, required, optional, error, hint, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {required && <span className="text-red-500 text-xs leading-none">*</span>}
        {optional && <span className="text-xs text-muted-foreground">(opcional)</span>}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError msg={error} />
    </div>
  );
}

function Select({ value, onChange, children, className = '' }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </select>
  );
}

function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-card border rounded-xl p-5 sm:p-6 shadow-card ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="font-semibold text-base text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── BrandingPreview ──────────────────────────────────────────────────────────
function isLightColor(hex) {
  if (!hex) return false;
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.substring(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function BrandingPreview({ form, logoPreview }) {
  const light = isLightColor(form.primaryColor);
  const fgRgb = light ? '30,41,59' : '248,250,252';
  const fg = (a) => `rgba(${fgRgb},${a})`;
  const secondaryLight = isLightColor(form.secondaryColor);
  const btnFg = secondaryLight ? '#1e293b' : '#ffffff';

  return (
    <Card title="Preview do sistema" subtitle="Como o cliente verá o sistema com as cores selecionadas">
      <div className="border rounded-xl overflow-hidden shadow-sm" style={{ height: '300px' }}>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border-b">
          {['red','yellow','green'].map(c => <div key={c} className={`w-2.5 h-2.5 rounded-full bg-${c}-400`} />)}
          <div className="flex-1 mx-2 bg-white rounded border text-[9px] text-gray-400 px-2 py-0.5 text-center truncate">
            app.bylance.io/{form.slug || 'sua-empresa'}
          </div>
        </div>
        <div className="flex h-full">
          <div className="w-36 shrink-0 flex flex-col h-full border-r" style={{ backgroundColor: form.primaryColor, borderColor: fg(0.1) }}>
            <div className="flex items-center gap-2 px-3 py-3 border-b" style={{ borderColor: fg(0.1) }}>
              {logoPreview
                ? <img src={logoPreview} alt="" className="h-5 w-5 rounded object-contain shrink-0" style={{ backgroundColor: form.iconBgColor }} />
                : <div className="h-5 w-5 rounded shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: fg(0.18), color: fg(1) }}>{form.name?.[0]?.toUpperCase() || 'B'}</div>
              }
              <span className="text-[10px] font-bold truncate" style={{ color: fg(1) }}>{form.name || 'Empresa'}</span>
            </div>
            <nav className="flex-1 py-1.5 px-1.5 space-y-0.5">
              {PREVIEW_NAV.map((item, i) => (
                <div key={item.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md" style={{ backgroundColor: i === 0 ? fg(0.15) : 'transparent', color: i === 0 ? fg(1) : fg(0.5), fontSize: '9px' }}>
                  <item.icon style={{ width: 10, height: 10, flexShrink: 0 }} />{item.label}
                </div>
              ))}
            </nav>
            <div className="px-3 py-2 border-t flex items-center gap-1.5" style={{ borderColor: fg(0.1) }}>
              <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[7px] font-bold" style={{ backgroundColor: fg(0.15), color: fg(1) }}>J</div>
              <div className="text-[8px] font-medium truncate" style={{ color: fg(1) }}>João Silva</div>
              <LogOut style={{ width: 8, height: 8, color: fg(0.4), marginLeft: 'auto' }} />
            </div>
          </div>
          <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b bg-white text-[10px] font-semibold text-gray-700">Bom dia, João 👋</div>
            <div className="flex-1 p-2.5 space-y-2 overflow-hidden">
              <div className="grid grid-cols-2 gap-1.5">
                {[['OS em aberto','12'],['Clientes','48'],['Faturamento','R$3.2k'],['Garantias','5']].map(([l, v]) => (
                  <div key={l} className="bg-white border rounded-md p-1.5">
                    <div className="text-[7px] text-gray-400 mb-0.5">{l}</div>
                    <div className="text-[10px] font-bold" style={{ color: form.secondaryColor }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                {['+ Nova OS','+ Cliente','Financeiro'].map(l => (
                  <div key={l} className="text-[7px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: form.secondaryColor, color: btnFg }}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Step components ───────────────────────────────────────────────────────────
function StepEmpresa({ form, errors, onChange, slugChecking, onSlugBlur }) {
  return (
    <div className="space-y-5">
      <Card title="Identificação" subtitle="Dados principais da empresa">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome fantasia" required error={errors.name}>
            <Input value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="Ex: Auto Mecânica Silva" />
          </Field>
          <Field label="Razão social" optional error={errors.razaoSocial}>
            <Input value={form.razaoSocial} onChange={e => onChange('razaoSocial', e.target.value)} placeholder="Ex: Silva Serviços Ltda" />
          </Field>
          <Field label="CNPJ" optional error={errors.cnpj}>
            <Input value={form.cnpj} onChange={e => onChange('cnpj', fmtCNPJ(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} />
          </Field>
          <Field label="Inscrição Estadual" optional>
            <Input value={form.inscricaoEstadual} onChange={e => onChange('inscricaoEstadual', e.target.value)} placeholder="Opcional" />
          </Field>
          <Field label="Telefone" optional>
            <Input value={form.telefone} onChange={e => onChange('telefone', fmtPhone(e.target.value))} placeholder="(11) 99999-9999" maxLength={15} />
          </Field>
          <Field label="Site" optional>
            <Input value={form.site} onChange={e => onChange('site', e.target.value)} placeholder="https://www.empresa.com.br" />
          </Field>
        </div>
      </Card>

      <Card title="Classificação e acesso">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tipo de negócio" required error={errors.businessType}>
            <Select value={form.businessType} onChange={e => onChange('businessType', e.target.value)}>
              <option value="">Selecione...</option>
              {BUSINESS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </Select>
          </Field>
          <Field label="Porte" optional>
            <Select value={form.porte} onChange={e => onChange('porte', e.target.value)}>
              <option value="">Selecione...</option>
              {PORTES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Slug (URL da empresa)" required error={errors.slug} hint="app.bylance.io/[slug]">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground pointer-events-none">app/</span>
              <Input
                value={form.slug}
                onChange={e => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                onBlur={onSlugBlur}
                className="pl-11"
                placeholder="nome-da-empresa"
              />
              {slugChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
          </Field>
          <Field label="Status">
            <label className="flex items-center gap-2.5 h-10 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => onChange('active', e.target.checked)} className="w-4 h-4 rounded border-input accent-primary" />
              <span className="text-sm">Empresa ativa</span>
            </label>
          </Field>
        </div>
      </Card>
    </div>
  );
}

function StepEndereco({ form, onChange, cepLoading, onCepBlur }) {
  return (
    <Card title="Endereço" subtitle="Localização da empresa — todos os campos são opcionais">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="CEP" optional hint="Preencha para autocompletar o endereço">
          <div className="relative">
            <Input value={form.cep} onChange={e => onChange('cep', fmtCEP(e.target.value))} onBlur={onCepBlur} placeholder="00000-000" maxLength={9} />
            {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </Field>
        <Field label="Estado" optional>
          <Select value={form.estado} onChange={e => onChange('estado', e.target.value)}>
            <option value="">Selecione...</option>
            {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </Select>
        </Field>
        <Field label="Logradouro" optional className="sm:col-span-2">
          <Input value={form.logradouro} onChange={e => onChange('logradouro', e.target.value)} placeholder="Rua, Avenida..." />
        </Field>
        <Field label="Número" optional>
          <Input value={form.numero} onChange={e => onChange('numero', e.target.value)} placeholder="Ex: 123" />
        </Field>
        <Field label="Complemento" optional>
          <Input value={form.complemento} onChange={e => onChange('complemento', e.target.value)} placeholder="Sala, Galpão..." />
        </Field>
        <Field label="Bairro" optional>
          <Input value={form.bairro} onChange={e => onChange('bairro', e.target.value)} placeholder="Ex: Centro" />
        </Field>
        <Field label="Cidade" optional>
          <Input value={form.cidade} onChange={e => onChange('cidade', e.target.value)} placeholder="Ex: São Paulo" />
        </Field>
      </div>
    </Card>
  );
}

function StepResponsavel({ form, errors, onChange }) {
  return (
    <Card title="Responsável principal" subtitle="Pessoa de contato — todos os campos são opcionais">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome" optional>
          <Input value={form.responsavelNome} onChange={e => onChange('responsavelNome', e.target.value)} placeholder="Ex: João Silva" />
        </Field>
        <Field label="Cargo" optional>
          <Input value={form.responsavelCargo} onChange={e => onChange('responsavelCargo', e.target.value)} placeholder="Ex: Proprietário, Diretor" />
        </Field>
        <Field label="Email" optional error={errors.responsavelEmail}>
          <Input type="email" value={form.responsavelEmail} onChange={e => onChange('responsavelEmail', e.target.value)} placeholder="contato@empresa.com" />
        </Field>
        <Field label="Telefone" optional>
          <Input value={form.responsavelTelefone} onChange={e => onChange('responsavelTelefone', fmtPhone(e.target.value))} placeholder="(11) 99999-9999" maxLength={15} />
        </Field>
      </div>
    </Card>
  );
}

function StepPlano({ form, errors, onChange }) {
  return (
    <div className="space-y-5">
      <Card title="Plano contratado">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLANS.map(p => (
            <label key={p.value} className={`flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.plan === p.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <input type="radio" name="plan" value={p.value} checked={form.plan === p.value} onChange={() => onChange('plan', p.value)} className="sr-only" />
              <span className="font-semibold text-sm">{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.desc}</span>
              {form.plan === p.value && <Check className="w-4 h-4 text-primary mt-1" />}
            </label>
          ))}
        </div>
      </Card>

      <Card title="Configuração comercial" subtitle="Dados financeiros e contratuais">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Status do plano">
            <Select value={form.planStatus} onChange={e => onChange('planStatus', e.target.value)}>
              {PLAN_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Tipo de cobrança" optional>
            <Select value={form.planBillingType} onChange={e => onChange('planBillingType', e.target.value)}>
              {BILLING_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </Select>
          </Field>
          <Field label="Valor contratado (R$)" optional error={errors.planValue}>
            <Input type="number" min="0" step="0.01" value={form.planValue} onChange={e => onChange('planValue', e.target.value)} placeholder="Ex: 199.90" />
          </Field>
          <Field label="Limite de usuários" optional>
            <Input type="number" min="1" max="9999" value={form.maxUsers} onChange={e => onChange('maxUsers', e.target.value)} />
          </Field>
          <Field label="Data de início" optional>
            <Input type="date" value={form.planStartDate} onChange={e => onChange('planStartDate', e.target.value)} />
          </Field>
          <Field label="Data de vencimento" optional>
            <Input type="date" value={form.planEndDate} onChange={e => onChange('planEndDate', e.target.value)} />
          </Field>
          <Field label="Observações contratuais" optional className="sm:col-span-2">
            <textarea
              value={form.planNotes}
              onChange={e => onChange('planNotes', e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder="Condições especiais, observações..."
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}

function StepVisual({ form, onChange, modules, onToggleModule, logoPreview, setLogoPreview, setLogoFile }) {
  const fileInputRef = useRef(null);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 2MB.'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      <Card title="Identidade visual" subtitle="Logo e paleta de cores do sistema">
        <div className="space-y-5">
          <Field label="Logo" optional hint="PNG, JPG, WEBP — máx. 2MB">
            <div className="flex items-center gap-4">
              {logoPreview
                ? (<div className="relative">
                    <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-lg object-contain border bg-white p-1" />
                    <button type="button" onClick={removeLogo} className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>)
                : (<div onClick={() => fileInputRef.current?.click()} className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-1">Logo</span>
                  </div>)
              }
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {logoPreview ? 'Trocar imagem' : 'Selecionar logo'}
              </Button>
              <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={handleLogoChange} className="hidden" />
            </div>
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Cor primária">
              <Input type="color" value={form.primaryColor} onChange={e => onChange('primaryColor', e.target.value)} className="h-10 p-1 cursor-pointer" />
            </Field>
            <Field label="Cor secundária">
              <Input type="color" value={form.secondaryColor} onChange={e => onChange('secondaryColor', e.target.value)} className="h-10 p-1 cursor-pointer" />
            </Field>
            <Field label="Fundo do ícone">
              <Input type="color" value={form.iconBgColor} onChange={e => onChange('iconBgColor', e.target.value)} className="h-10 p-1 cursor-pointer" />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Módulos ativos" subtitle="Funcionalidades disponíveis para esta empresa">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_MODULES.map(m => {
            const mod = modules.find(mod => mod.module === m.key);
            const IconComp = m.icon;
            return (
              <label key={m.key} className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-all ${mod?.active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <input type="checkbox" checked={mod?.active || false} onChange={() => onToggleModule(m.key)} className="sr-only" />
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${mod?.active ? 'bg-primary/15' : 'bg-muted'}`}>
                  <IconComp className={`w-3.5 h-3.5 ${mod?.active ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <span className="text-sm font-medium flex-1">{m.label}</span>
                {mod?.active && <Check className="w-4 h-4 text-primary" />}
              </label>
            );
          })}
        </div>
      </Card>

      <BrandingPreview form={form} logoPreview={logoPreview} />
    </div>
  );
}

function StepAdmin({ director, errors, onChange, skip, setSkip }) {
  const [showPass, setShowPass] = useState(false);
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
        Crie o usuário com perfil de <strong>Diretor</strong> da empresa. Ele terá acesso completo ao sistema da empresa.
      </div>

      <Card>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={skip} onChange={e => setSkip(e.target.checked)} className="w-4 h-4 rounded border-input accent-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium">Criar administrador depois</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pule esta etapa e configure o acesso posteriormente na tela de detalhes da empresa.</p>
          </div>
        </label>
      </Card>

      {!skip && (
        <Card title="Dados do administrador">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome completo" required error={errors.adminName}>
              <Input value={director.name} onChange={e => onChange('name', e.target.value)} placeholder="Ex: João Silva" />
            </Field>
            <Field label="Email" required error={errors.adminEmail}>
              <Input type="email" value={director.email} onChange={e => onChange('email', e.target.value)} placeholder="admin@empresa.com" />
            </Field>
            <Field label="Senha" required error={errors.adminPassword} hint="Mínimo 6 caracteres" className="sm:col-span-2">
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={director.password}
                  onChange={e => onChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPass ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              </div>
            </Field>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReviewRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-2 border-b last:border-0 text-sm">
      <span className="text-muted-foreground shrink-0 mr-4">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function StepRevisao({ form, modules, director, skipAdmin }) {
  const planLabel = { basic: 'Básico', pro: 'Pro', enterprise: 'Enterprise' }[form.plan] || form.plan;
  const billingLabel = { monthly: 'Mensal', annual: 'Anual', avulso: 'Avulso' }[form.planBillingType];
  const activeModules = modules.filter(m => m.active).map(m => ALL_MODULES.find(a => a.key === m.module)?.label).filter(Boolean);
  const statusLabel = PLAN_STATUSES.find(s => s.value === form.planStatus)?.label;
  const fmtLocalDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : undefined;

  return (
    <div className="space-y-5">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
        Tudo certo? Revise e confirme para criar a empresa.
      </div>

      {/* LGPD notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-semibold">Aviso de privacidade — LGPD (Lei 13.709/2018)</p>
          <p>Os dados coletados neste formulário são utilizados exclusivamente para execução do contrato de prestação de serviços (base legal: Art. 7, II da LGPD). Dados institucionais (razão social, CNPJ, endereço) e dados do responsável (nome, e-mail, telefone) serão armazenados de forma segura com retenção mínima de 5 anos conforme o art. 2.031 do Código Civil. Não há compartilhamento com terceiros sem consentimento explícito.</p>
        </div>
      </div>

      <Card title="Empresa">
        <ReviewRow label="Nome fantasia" value={form.name} />
        <ReviewRow label="Razão social" value={form.razaoSocial} />
        <ReviewRow label="CNPJ" value={form.cnpj} />
        <ReviewRow label="Tipo de negócio" value={BUSINESS_TYPES.find(b => b.value === form.businessType)?.label} />
        <ReviewRow label="Porte" value={PORTES.find(p => p.value === form.porte)?.label} />
        <ReviewRow label="Slug" value={`/app/${form.slug}`} />
        <ReviewRow label="Status" value={form.active ? 'Ativa' : 'Inativa'} />
        <ReviewRow label="Telefone" value={form.telefone} />
        <ReviewRow label="Site" value={form.site} />
      </Card>

      {(form.cidade || form.logradouro || form.cep) && (
        <Card title="Endereço">
          <ReviewRow label="CEP" value={form.cep} />
          <ReviewRow label="Endereço" value={[form.logradouro, form.numero, form.complemento].filter(Boolean).join(', ')} />
          <ReviewRow label="Bairro" value={form.bairro} />
          <ReviewRow label="Cidade / UF" value={[form.cidade, form.estado].filter(Boolean).join(' - ')} />
        </Card>
      )}

      {form.responsavelNome && (
        <Card title="Responsável">
          <ReviewRow label="Nome" value={form.responsavelNome} />
          <ReviewRow label="Cargo" value={form.responsavelCargo} />
          <ReviewRow label="Email" value={form.responsavelEmail} />
          <ReviewRow label="Telefone" value={form.responsavelTelefone} />
        </Card>
      )}

      <Card title="Plano">
        <ReviewRow label="Plano" value={planLabel} />
        <ReviewRow label="Status do plano" value={statusLabel} />
        <ReviewRow label="Valor" value={form.planValue ? `R$ ${parseFloat(form.planValue).toFixed(2)}` : undefined} />
        <ReviewRow label="Cobrança" value={billingLabel} />
        <ReviewRow label="Início" value={fmtLocalDate(form.planStartDate)} />
        <ReviewRow label="Vencimento" value={fmtLocalDate(form.planEndDate)} />
        <ReviewRow label="Limite de usuários" value={String(form.maxUsers)} />
      </Card>

      <Card title="Módulos ativos">
        <div className="flex flex-wrap gap-2">
          {activeModules.length > 0
            ? activeModules.map(m => <Badge key={m} variant="default">{m}</Badge>)
            : <span className="text-sm text-muted-foreground">Nenhum módulo ativo</span>}
        </div>
      </Card>

      {!skipAdmin && director.name ? (
        <Card title="Administrador">
          <ReviewRow label="Nome" value={director.name} />
          <ReviewRow label="Email" value={director.email} />
          <ReviewRow label="Senha" value="••••••••" />
        </Card>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          Nenhum administrador será criado agora. Configure o acesso depois na tela de detalhes da empresa.
        </div>
      )}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function WizardProgress({ steps, current, isEditing, onGoto }) {
  return (
    <div className="flex items-start gap-0 mb-8 overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const done = current > i + 1;
        const active = current === i + 1;
        const clickable = done || isEditing || active;
        const IconComp = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => clickable && onGoto(i + 1)}
              disabled={!clickable}
              className={`flex flex-col items-center gap-1 px-1 w-full transition-all ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                ${active ? 'bg-primary border-primary text-primary-foreground' :
                  done ? 'bg-primary/15 border-primary text-primary' :
                  'bg-muted border-border text-muted-foreground'}`}>
                {done && !active ? <Check className="w-3.5 h-3.5" /> : <IconComp className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] whitespace-nowrap hidden sm:block leading-tight text-center
                ${active ? 'text-primary font-semibold' : done ? 'text-primary/70' : 'text-muted-foreground'}`}>
                {step.title}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 -mt-4 sm:-mt-5 transition-all ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TenantForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [modules, setModules] = useState(ALL_MODULES.map(m => ({ module: m.key, active: true })));
  const [director, setDirector] = useState({ name: '', email: '', password: '' });
  const [skipAdmin, setSkipAdmin] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [pageLoading, setPageLoading] = useState(isEditing);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const steps = useMemo(() => [
    { key: 'empresa',     title: 'Empresa',     icon: Building2 },
    { key: 'endereco',    title: 'Endereço',    icon: MapPin },
    { key: 'responsavel', title: 'Responsável', icon: User },
    { key: 'plano',       title: 'Plano',       icon: CreditCard },
    { key: 'visual',      title: 'Visual',      icon: Paintbrush },
    ...(!isEditing ? [{ key: 'admin', title: 'Acesso', icon: KeyRound }] : []),
    { key: 'revisao',     title: 'Revisão',     icon: ClipboardCheck },
  ], [isEditing]);

  const totalSteps = steps.length;

  // Load tenant or draft
  useEffect(() => {
    if (isEditing) {
      api.get(`/tenants/${id}`).then(res => {
        const t = res.data.data;
        setForm({
          name: t.name || '',
          razaoSocial: t.razaoSocial || '',
          cnpj: t.cnpj ? fmtCNPJ(t.cnpj) : '',
          inscricaoEstadual: t.inscricaoEstadual || '',
          inscricaoMunicipal: t.inscricaoMunicipal || '',
          businessType: t.businessType || '',
          porte: t.porte || '',
          site: t.site || '',
          slug: t.slug || '',
          active: t.active ?? true,
          telefone: t.telefone ? fmtPhone(t.telefone) : '',
          cep: t.cep ? fmtCEP(t.cep) : '',
          logradouro: t.logradouro || '',
          numero: t.numero || '',
          complemento: t.complemento || '',
          bairro: t.bairro || '',
          cidade: t.cidade || '',
          estado: t.estado || '',
          responsavelNome: t.responsavelNome || '',
          responsavelEmail: t.responsavelEmail || '',
          responsavelTelefone: t.responsavelTelefone ? fmtPhone(t.responsavelTelefone) : '',
          responsavelCargo: t.responsavelCargo || '',
          plan: t.plan || 'basic',
          planStatus: t.planStatus || 'ativo',
          planValue: t.planValue != null ? String(t.planValue) : '',
          planBillingType: t.planBillingType || 'monthly',
          planStartDate: t.planStartDate ? t.planStartDate.slice(0, 10) : '',
          planEndDate: t.planEndDate ? t.planEndDate.slice(0, 10) : '',
          planNotes: t.planNotes || '',
          maxUsers: t.maxUsers ?? 10,
          primaryColor: t.primaryColor || '#1e40af',
          secondaryColor: t.secondaryColor || '#3b82f6',
          iconBgColor: t.iconBgColor || '#ffffff',
          logo: t.logo || '',
        });
        if (t.logo) setLogoPreview(t.logo);
        if (t.modules?.length) {
          setModules(ALL_MODULES.map(m => ({
            module: m.key,
            active: t.modules.some(tm => tm.module === m.key && tm.active),
          })));
        }
      }).catch(() => toast.error('Erro ao carregar empresa')).finally(() => setPageLoading(false));
    } else {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        try {
          const { form: f, modules: mods, step } = JSON.parse(raw);
          if (f) setForm(prev => ({ ...prev, ...f }));
          if (mods) setModules(mods);
          if (step) setCurrentStep(step);
          toast.info('Rascunho restaurado', { description: 'Retomando onde você parou.' });
        } catch {}
      }
    }
  }, [id, isEditing]);

  // Auto-save draft
  useEffect(() => {
    if (!isEditing) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, modules, step: currentStep }));
    }
  }, [form, modules, currentStep, isEditing]);

  const onChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const onDirectorChange = useCallback((field, value) => {
    setDirector(prev => ({ ...prev, [field]: value }));
    const key = `admin${field[0].toUpperCase()}${field.slice(1)}`;
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  const onSlugBlur = () => {
    if (!form.slug) return;
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setErrors(prev => ({ ...prev, slug: 'Apenas letras minúsculas, números e hífens' }));
    }
  };

  const onCepBlur = async () => {
    const digits = form.cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch {}
    finally { setCepLoading(false); }
  };

  const adminStepIndex = steps.findIndex(s => s.key === 'admin') + 1;

  const validateCurrentStep = () => {
    const errs = {};
    const stepKey = steps[currentStep - 1]?.key;

    if (stepKey === 'empresa') {
      if (!form.name.trim()) errs.name = 'Nome fantasia é obrigatório';
      if (!form.slug.trim()) errs.slug = 'Slug é obrigatório';
      else if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = 'Apenas letras minúsculas, números e hífens';
      if (!form.businessType) errs.businessType = 'Tipo de negócio é obrigatório';
      const cnpjDigits = form.cnpj.replace(/\D/g, '');
      if (cnpjDigits.length > 0 && !validateCNPJ(form.cnpj)) errs.cnpj = 'CNPJ inválido';
    }
    if (stepKey === 'responsavel') {
      if (form.responsavelEmail && !isValidEmail(form.responsavelEmail)) errs.responsavelEmail = 'Email inválido';
    }
    if (stepKey === 'admin' && !skipAdmin) {
      if (!director.name.trim()) errs.adminName = 'Nome é obrigatório';
      if (!director.email.trim()) errs.adminEmail = 'Email é obrigatório';
      else if (!isValidEmail(director.email)) errs.adminEmail = 'Email inválido';
      if (director.password.length < 6) errs.adminPassword = 'Mínimo 6 caracteres';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => { if (validateCurrentStep()) setCurrentStep(s => Math.min(s + 1, totalSteps)); };
  const goPrev = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        cnpj: form.cnpj.replace(/\D/g, '') || null,
        telefone: form.telefone.replace(/\D/g, '') || null,
        responsavelTelefone: form.responsavelTelefone.replace(/\D/g, '') || null,
        cep: form.cep.replace(/\D/g, '') || null,
        planStartDate: form.planStartDate ? new Date(form.planStartDate + 'T00:00:00').toISOString() : null,
        planEndDate: form.planEndDate ? new Date(form.planEndDate + 'T00:00:00').toISOString() : null,
        planValue: form.planValue ? parseFloat(form.planValue) : null,
        maxUsers: parseInt(form.maxUsers) || 10,
        ...['razaoSocial','inscricaoEstadual','inscricaoMunicipal','porte','site',
            'logradouro','numero','complemento','bairro','cidade','estado',
            'responsavelNome','responsavelEmail','responsavelCargo','planNotes','planBillingType']
          .reduce((acc, k) => ({ ...acc, [k]: form[k] || null }), {}),
      };
      delete payload.logo;

      let tenantId = id;

      if (isEditing) {
        setSubmitStep('Salvando dados da empresa…');
        await api.put(`/tenants/${id}`, payload);
        setSubmitStep('Atualizando módulos…');
        await api.put(`/tenants/${id}/modules`, { modules });
        if (logoFile) {
          setSubmitStep('Enviando logo…');
          const fd = new FormData();
          fd.append('logo', logoFile);
          await api.post(`/tenants/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
        toast.success('Empresa atualizada com sucesso!');
      } else {
        setSubmitStep('Criando empresa…');
        const res = await api.post('/tenants', payload);
        tenantId = res.data.data.id;
        setSubmitStep('Configurando módulos…');
        await api.put(`/tenants/${tenantId}/modules`, { modules });
        if (logoFile) {
          setSubmitStep('Enviando logo…');
          const fd = new FormData();
          fd.append('logo', logoFile);
          await api.post(`/tenants/${tenantId}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
        if (!skipAdmin && director.name && director.email && director.password) {
          setSubmitStep('Criando administrador…');
          await api.post('/auth/register', {
            name: director.name, email: director.email, password: director.password,
            role: 'director', tenantId,
          });
        }
        localStorage.removeItem(DRAFT_KEY);
        toast.success('Empresa criada com sucesso!');
      }

      navigate(`/admin/tenants/${tenantId}/detail`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao salvar';
      if (msg.toLowerCase().includes('slug')) {
        setErrors({ slug: 'Este slug já está em uso' });
        setCurrentStep(1);
      } else if (msg.toLowerCase().includes('email')) {
        setErrors({ adminEmail: 'Este email já está em uso' });
        setCurrentStep(adminStepIndex || totalSteps - 1);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
      setSubmitStep('');
    }
  };

  const toggleModule = (key) => setModules(m => m.map(mod => mod.module === key ? { ...mod, active: !mod.active } : mod));

  const clearDraft = () => {
    if (!confirm('Descartar rascunho e começar do zero?')) return;
    localStorage.removeItem(DRAFT_KEY);
    setForm(INITIAL_FORM);
    setModules(ALL_MODULES.map(m => ({ module: m.key, active: true })));
    setDirector({ name: '', email: '', password: '' });
    setSkipAdmin(false);
    setCurrentStep(1);
    setErrors({});
    setLogoFile(null);
    setLogoPreview(null);
  };

  if (pageLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const stepKey = steps[currentStep - 1]?.key;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isEditing ? 'Editar empresa' : 'Cadastro de empresa'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing ? 'Atualize os dados cadastrais' : `Etapa ${currentStep} de ${totalSteps}`}
          </p>
        </div>
        {!isEditing && (
          <button type="button" onClick={clearDraft} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
            Descartar rascunho
          </button>
        )}
      </div>

      {/* Progress */}
      <WizardProgress steps={steps} current={currentStep} isEditing={isEditing} onGoto={setCurrentStep} />

      {/* Step content */}
      <div className="min-h-[380px]">
        {stepKey === 'empresa'     && <StepEmpresa     form={form} errors={errors} onChange={onChange} slugChecking={slugChecking} onSlugBlur={onSlugBlur} />}
        {stepKey === 'endereco'    && <StepEndereco    form={form} onChange={onChange} cepLoading={cepLoading} onCepBlur={onCepBlur} />}
        {stepKey === 'responsavel' && <StepResponsavel form={form} errors={errors} onChange={onChange} />}
        {stepKey === 'plano'       && <StepPlano       form={form} errors={errors} onChange={onChange} />}
        {stepKey === 'visual'      && <StepVisual      form={form} onChange={onChange} modules={modules} onToggleModule={toggleModule} logoPreview={logoPreview} setLogoPreview={setLogoPreview} setLogoFile={setLogoFile} />}
        {stepKey === 'admin'       && <StepAdmin       director={director} errors={errors} onChange={onDirectorChange} skip={skipAdmin} setSkip={setSkipAdmin} />}
        {stepKey === 'revisao'     && <StepRevisao     form={form} modules={modules} director={director} skipAdmin={skipAdmin} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={currentStep === 1 ? () => navigate('/admin/tenants') : goPrev}
        >
          <ChevronLeft className="w-4 h-4" />
          {currentStep === 1 ? 'Cancelar' : 'Anterior'}
        </Button>

        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />{submitStep || 'Processando...'}</>
              : <><Check className="w-4 h-4" />{isEditing ? 'Salvar alterações' : 'Criar empresa'}</>
            }
          </Button>
        ) : (
          <Button type="button" onClick={goNext}>
            Próximo <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
