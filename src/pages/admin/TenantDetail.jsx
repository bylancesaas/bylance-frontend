import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '@/api/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import DestructiveModal from '@/components/DestructiveModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Building2, Users, Pencil, ArrowLeft, CheckCircle2, XCircle,
  AlertTriangle, LayoutGrid, User, Package, FileText, Shield,
  DollarSign, BarChart3, Settings2, Mail, Layers, Calendar,
  CreditCard, Activity, Power, FileCheck, Upload, Send,
  ClipboardList, Lock, ExternalLink, Clock, Trash2,
} from 'lucide-react';

// ── constants ────────────────────────────────────────────────────────────────
const MODULE_META = {
  dashboard:      { label: 'Dashboard',          icon: BarChart3 },
  clients:        { label: 'Clientes',            icon: Users },
  items:          { label: 'Peças & Itens',       icon: Package },
  services:       { label: 'Serviços',            icon: Settings2 },
  serviceOrders:  { label: 'Ordens de Serviço',   icon: FileText },
  warranties:     { label: 'Garantias',           icon: Shield },
  financial:      { label: 'Financeiro',          icon: DollarSign },
  userManagement: { label: 'Gestão de Usuários',  icon: User },
};

const PLAN_LABELS = {
  basic: 'Básico', pro: 'Pro', enterprise: 'Enterprise', free: 'Grátis', trial: 'Trial',
};

const ROLE_LABELS = {
  director: 'Diretor', admin: 'Admin', mechanic: 'Mecânico', super_admin: 'Super Admin',
};

const BUSINESS_LABELS = {
  mecanica: 'Mecânica Geral', oficina: 'Oficina Multi-Serviço', eletrica: 'Elétrica Automotiva',
  ar_condicionado: 'Ar-Condicionado', funilaria: 'Funilaria e Pintura',
  refrigeracao: 'Refrigeração', geral: 'Geral / Outro',
};

const PLAN_STATUS_LABELS = {
  ativo: 'Ativo', trial: 'Trial', suspenso: 'Suspenso', cancelado: 'Cancelado', cortesia: 'Cortesia',
};

const PORTE_LABELS = {
  mei: 'MEI', pequena: 'Pequena Empresa', media: 'Média Empresa', grande: 'Grande Empresa',
};

const BILLING_LABELS = { monthly: 'Mensal', annual: 'Anual', avulso: 'Avulso' };

const CONTRACT_STATUS_LABELS = {
  nao_gerado: 'Não gerado',
  gerado:     'Gerado',
  enviado:    'Enviado',
  assinado:   'Assinado',
  cancelado:  'Cancelado',
};

const CONTRACT_STATUS_COLORS = {
  nao_gerado: 'bg-muted border-border text-muted-foreground',
  gerado:     'bg-blue-50 border-blue-200 text-blue-700',
  enviado:    'bg-amber-50 border-amber-200 text-amber-700',
  assinado:   'bg-emerald-50 border-emerald-200 text-emerald-700',
  cancelado:  'bg-red-50 border-red-200 text-red-700',
};

const ONBOARDING_LABELS = {
  pendente:    'Pendente',
  em_andamento:'Em andamento',
  concluido:   'Concluído',
};

const CATEGORY_LABELS = {
  geral:     'Geral',
  cadastro:  'Cadastro',
  contrato:  'Contrato',
  modulos:   'Módulos',
};

const TABS = [
  { key: 'geral',     label: 'Geral',    icon: Building2 },
  { key: 'plano',     label: 'Plano',    icon: CreditCard },
  { key: 'modulos',   label: 'Módulos',  icon: Layers },
  { key: 'usuarios',  label: 'Usuários', icon: Users },
  { key: 'contrato',  label: 'Contrato', icon: FileCheck },
  { key: 'auditoria', label: 'Auditoria',icon: ClipboardList },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRelative(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months > 1 ? 'es' : ''}`;
  return `há ${Math.floor(months / 12)} ano${Math.floor(months / 12) > 1 ? 's' : ''}`;
}

// ── small components ─────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 py-2.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card rounded-xl border shadow-card p-5 space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

function AlertBanner({ icon: Icon, color, children }) {
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${color}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      {children}
    </div>
  );
}

// ── tabs ─────────────────────────────────────────────────────────────────────
function TabGeral({ t }) {
  const fmtPhone = (v) => {
    if (!v) return null;
    const d = v.replace(/\D/g, '');
    if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };
  const fmtCNPJ = (v) => v?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || null;
  const addr = [t.logradouro, t.numero, t.complemento].filter(Boolean).join(', ');
  const cityState = [t.cidade, t.estado].filter(Boolean).join(' - ');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Identificação">
          <InfoRow label="Nome fantasia" value={t.name} />
          <InfoRow label="Razão social" value={t.razaoSocial} />
          <InfoRow label="CNPJ" value={fmtCNPJ(t.cnpj)} />
          <InfoRow label="Insc. Estadual" value={t.inscricaoEstadual} />
          <InfoRow label="Tipo de negócio" value={BUSINESS_LABELS[t.businessType] || t.businessType} />
          <InfoRow label="Porte" value={PORTE_LABELS[t.porte] || t.porte} />
          <InfoRow label="Telefone" value={fmtPhone(t.telefone)} />
          <InfoRow label="Site" value={t.site} />
          <InfoRow label="Slug" value={`/${t.slug}`} />
          <InfoRow label="Criado" value={`${fmtDate(t.createdAt)} (${fmtRelative(t.createdAt)})`} />
        </Section>

        <Section title="Volume">
          <InfoRow label="Usuários" value={t._count?.users ?? 0} />
          <InfoRow label="Clientes" value={t._count?.clients ?? 0} />
          <InfoRow label="Ordens de serviço" value={t._count?.serviceOrders ?? 0} />
          <InfoRow label="Módulos ativos" value={(t.modules || []).filter(m => m.active).length} />
        </Section>
      </div>

      {(t.responsavelNome || t.responsavelEmail || t.responsavelTelefone) && (
        <Section title="Responsável principal">
          <InfoRow label="Nome" value={t.responsavelNome} />
          <InfoRow label="Cargo" value={t.responsavelCargo} />
          <InfoRow label="Email" value={t.responsavelEmail} />
          <InfoRow label="Telefone" value={fmtPhone(t.responsavelTelefone)} />
        </Section>
      )}

      {(t.cidade || t.bairro || t.cep) && (
        <Section title="Endereço">
          <InfoRow label="Logradouro" value={addr || null} />
          <InfoRow label="Bairro" value={t.bairro} />
          <InfoRow label="Cidade / UF" value={cityState || null} />
          <InfoRow label="CEP" value={t.cep ? `${t.cep.slice(0,5)}-${t.cep.slice(5)}` : null} />
        </Section>
      )}
    </div>
  );
}

function TabPlano({ t }) {
  const planLabel = PLAN_LABELS[t.plan] || t.plan;
  const planStatusLabel = PLAN_STATUS_LABELS[t.planStatus] || t.planStatus;
  const billingLabel = BILLING_LABELS[t.planBillingType];
  const planStatusVariant = {
    ativo: 'success', trial: 'warning', suspenso: 'destructive',
    cancelado: 'destructive', cortesia: 'secondary',
  }[t.planStatus] || 'secondary';

  const now = new Date();
  const endDate = t.planEndDate ? new Date(t.planEndDate) : null;
  const isExpired = endDate && endDate < now;
  const isExpiringSoon = endDate && !isExpired && (endDate - now) < 30 * 86400000;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Plano">
          <InfoRow label="Plano" value={<Badge variant="default">{planLabel}</Badge>} />
          <InfoRow label="Status do plano" value={<Badge variant={planStatusVariant}>{planStatusLabel || '—'}</Badge>} />
          <InfoRow label="Tipo de cobrança" value={billingLabel} />
          <InfoRow label="Valor contratado" value={t.planValue != null ? `R$ ${Number(t.planValue).toFixed(2)}` : null} />
          <InfoRow label="Limite de usuários" value={t.maxUsers != null ? String(t.maxUsers) : null} />
        </Section>
        <Section title="Vigência">
          <InfoRow label="Início" value={fmtDate(t.planStartDate)} />
          <InfoRow label="Vencimento" value={
            endDate ? (
              <span className={isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-amber-600 font-semibold' : ''}>
                {fmtDate(t.planEndDate)}
                {isExpired && ' · Vencido'}
                {isExpiringSoon && ' · Vencendo em breve'}
              </span>
            ) : null
          } />
          <InfoRow label="Status empresa" value={
            <Badge variant={t.active ? 'success' : 'destructive'}>
              {t.active ? 'Ativa' : 'Inativa'}
            </Badge>
          } />
        </Section>
      </div>

      {t.planNotes && (
        <Section title="Observações contratuais">
          <p className="text-sm text-foreground whitespace-pre-wrap">{t.planNotes}</p>
        </Section>
      )}

      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
          ⚠ Plano vencido em {fmtDate(t.planEndDate)}. Acesse edição para renovar.
        </div>
      )}
      {isExpiringSoon && !isExpired && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
          O plano vence em {fmtDate(t.planEndDate)}. Entre em contato com o cliente.
        </div>
      )}
      {!t.planStartDate && !t.planEndDate && !t.planValue && (
        <div className="bg-muted/50 border rounded-xl px-4 py-3 text-sm text-muted-foreground">
          Dados contratuais não configurados. Edite a empresa para adicionar vigência e valor.
        </div>
      )}
    </div>
  );
}

function TabModulos({ t }) {
  const modules = t.modules || [];
  const active = modules.filter(m => m.active);
  const inactive = modules.filter(m => !m.active);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-foreground">{active.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ativos</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-foreground">{inactive.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Inativos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(MODULE_META).map(([key, meta]) => {
          const mod = modules.find(m => m.module === key);
          const isActive = mod?.active ?? false;
          const IconComp = meta.icon;
          return (
            <div key={key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
              ${isActive ? 'bg-card' : 'bg-muted/30 opacity-60'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                <IconComp className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{meta.label}</p>
              </div>
              <Badge variant={isActive ? 'success' : 'secondary'}>
                {isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabUsuarios({ t }) {
  const users = t.users || [];
  if (users.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-10 text-center shadow-card">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">Nenhum usuário cadastrado</p>
        <p className="text-xs text-muted-foreground mt-1">Esta empresa ainda não possui usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
      <div className="bg-card border rounded-xl overflow-hidden shadow-card divide-y">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {u.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="w-3 h-3 shrink-0" /> {u.email}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary">{ROLE_LABELS[u.role] || u.role}</Badge>
              <Badge variant={u.active ? 'success' : 'destructive'}>
                {u.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="hidden sm:block text-xs text-muted-foreground w-24 text-right shrink-0">{fmtRelative(u.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabHistorico({ t }) {
  const events = [
    { date: t.updatedAt, label: 'Última atualização do cadastro', icon: Pencil },
    { date: t.createdAt, label: 'Empresa criada na plataforma', icon: Building2 },
  ].filter(Boolean);

  return (
    <div className="bg-card border rounded-xl shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linha do tempo</h3>
      </div>
      <ul className="divide-y">
        {events.map((ev, i) => {
          const IconComp = ev.icon;
          return (
            <li key={i} className="flex items-start gap-3 px-5 py-4">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <IconComp className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{ev.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(ev.date)} · {fmtRelative(ev.date)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── contract helpers ─────────────────────────────────────────────────────────
const CONTRACT_STEPS = [
  { key: 'nao_gerado', label: 'Pendente',  icon: Clock },
  { key: 'gerado',     label: 'Gerado',    icon: FileText },
  { key: 'enviado',    label: 'Enviado',   icon: Send },
  { key: 'assinado',   label: 'Assinado',  icon: FileCheck },
];

function ContractTimeline({ status }) {
  const steps = CONTRACT_STEPS;
  const currentIndex = steps.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = i <= currentIndex;
        const IconC = step.icon;
        return (
          <div key={step.key} className="flex items-center gap-0">
            <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors
              ${done ? 'bg-primary/10' : 'bg-muted/40'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center
                ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <IconC className="w-3.5 h-3.5" />
              </div>
              <span className={`text-xs font-medium ${done ? 'text-primary' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-6 mx-0 shrink-0 ${i < currentIndex ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabContrato({ t, onRefresh }) {
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [signedBy, setSignedBy] = useState('');
  const status = t.contractStatus || 'nao_gerado';
  const isCancelled = status === 'cancelado';

  const advance = async (newStatus, extra = {}) => {
    setUpdating(true);
    try {
      await api.put(`/tenants/${t.id}/contract`, { contractStatus: newStatus, ...extra });
      toast.success(`Contrato marcado como "${CONTRACT_STATUS_LABELS[newStatus]}"`);
      onRefresh();
    } catch { toast.error('Erro ao atualizar contrato'); }
    finally { setUpdating(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('contract', file);
    setUploading(true);
    try {
      await api.post(`/tenants/${t.id}/contract/file`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Contrato assinado enviado');
      onRefresh();
    } catch { toast.error('Erro ao enviar arquivo'); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-4">
      {/* timeline */}
      <div className="bg-card border rounded-xl shadow-card p-5 overflow-x-auto">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Progresso do contrato</h3>
        <ContractTimeline status={status} />
      </div>

      {/* status detail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Status">
          <InfoRow label="Status atual" value={
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold
              ${CONTRACT_STATUS_COLORS[status]}`}>
              {CONTRACT_STATUS_LABELS[status] || status}
            </span>
          } />
          <InfoRow label="Gerado em" value={fmtDate(t.contractGeneratedAt)} />
          <InfoRow label="Enviado em" value={fmtDate(t.contractSentAt)} />
          <InfoRow label="Enviado para" value={t.contractSentTo} />
          <InfoRow label="Assinado em" value={fmtDate(t.contractSignedAt)} />
          <InfoRow label="Assinado por" value={t.contractSignedBy} />
        </Section>

        <Section title="Arquivo & observações">
          {t.contractFileUrl ? (
            <div className="mb-3">
              <a
                href={t.contractFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Ver contrato assinado
              </a>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">Nenhum arquivo enviado ainda.</p>
          )}
          {t.contractNotes && (
            <p className="text-sm text-foreground whitespace-pre-wrap border rounded-lg bg-muted/30 px-3 py-2">{t.contractNotes}</p>
          )}
        </Section>
      </div>

      {/* LGPD notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 space-y-0.5">
          <p className="font-semibold">Dados pessoais — LGPD</p>
          <p>Os dados deste contrato (CPF/CNPJ, e-mail, assinante) são tratados com base no Art. 7, II da Lei 13.709/2018
            (execução de contrato). Retenção mínima de 5 anos conforme art. 2.031 do Código Civil.</p>
        </div>
      </div>

      {/* actions */}
      {!isCancelled && (
        <div className="bg-card border rounded-xl shadow-card p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</h3>
          <div className="flex flex-wrap gap-2">
            {status === 'nao_gerado' && (
              <Button size="sm" onClick={() => advance('gerado')} disabled={updating}>
                <FileText className="w-3.5 h-3.5" /> Marcar como Gerado
              </Button>
            )}
            {status === 'gerado' && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="email"
                  value={sentTo}
                  onChange={e => setSentTo(e.target.value)}
                  placeholder="E-mail do destinatário (opcional)"
                  className="text-sm px-2.5 py-1.5 rounded-lg border bg-background outline-none focus:ring-2 focus:ring-primary/20 w-56"
                />
                <Button size="sm" onClick={() => advance('enviado', sentTo ? { contractSentTo: sentTo } : {})} disabled={updating}>
                  <Send className="w-3.5 h-3.5" /> Marcar como Enviado
                </Button>
              </div>
            )}
            {(status === 'enviado' || status === 'gerado') && (
              <>
                <Button size="sm" variant="outline" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'Enviando…' : 'Upload contrato assinado'}
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
                  </label>
                </Button>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={signedBy}
                    onChange={e => setSignedBy(e.target.value)}
                    placeholder="Nome do signatário (opcional)"
                    className="text-sm px-2.5 py-1.5 rounded-lg border bg-background outline-none focus:ring-2 focus:ring-primary/20 w-52"
                  />
                  <Button size="sm" variant="secondary" onClick={() => advance('assinado', signedBy ? { contractSignedBy: signedBy } : {})} disabled={updating}>
                    <FileCheck className="w-3.5 h-3.5" /> Marcar como Assinado
                  </Button>
                </div>
              </>
            )}
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50"
              onClick={() => advance('cancelado')} disabled={updating}>
              <XCircle className="w-3.5 h-3.5" /> Cancelar contrato
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORY_ICON = {
  geral:    Activity,
  cadastro: Pencil,
  contrato: FileCheck,
  modulos:  Layers,
};

function TabAuditoria({ t }) {
  const logs = t.auditLogs || [];

  if (logs.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-10 text-center shadow-card">
        <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">Nenhum registro de auditoria</p>
        <p className="text-xs text-muted-foreground mt-1">As ações registradas nesta empresa aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1">{logs.length} registro{logs.length !== 1 ? 's' : ''}</p>
      <div className="bg-card border rounded-xl overflow-hidden shadow-card">
        <ul className="divide-y">
          {logs.map(log => {
            const IconC = CATEGORY_ICON[log.category] || Activity;
            let meta = null;
            if (log.meta) { try { meta = JSON.parse(log.meta); } catch {} }
            return (
              <li key={log.id} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <IconC className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-medium text-foreground">{log.description}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {CATEGORY_LABELS[log.category] || log.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(log.performedAt)} · {fmtRelative(log.performedAt)} · por {log.performedBy}
                  </p>
                  {meta && (
                    <pre className="mt-1.5 text-xs bg-muted rounded px-2 py-1.5 overflow-x-auto max-w-full">
                      {JSON.stringify(meta, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral');
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modal, setModal] = useState(null); // null | 'deactivate' | 'delete'

  const load = () => {
    api.get(`/tenants/${id}`)
      .then(res => setTenant(res.data.data))
      .catch(() => { toast.error('Empresa não encontrada'); navigate('/admin/tenants'); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleToggleStatus = async () => {
    setModal('deactivate');
  };

  const handleModalConfirm = async (mode) => {
    if (mode === 'deactivate') {
      const next = !tenant.active;
      setToggling(true);
      try {
        await api.put(`/tenants/${id}`, { active: next });
        setTenant(prev => ({ ...prev, active: next }));
        toast.success(`Empresa ${next ? 'reativada' : 'desativada'} com sucesso`);
        setModal(null);
      } catch {
        toast.error('Erro ao alterar status');
      } finally {
        setToggling(false);
      }
    } else if (mode === 'delete') {
      setDeleting(true);
      try {
        await api.delete(`/tenants/${id}`, { data: { confirmName: tenant.name } });
        toast.success('Empresa excluída permanentemente');
        setModal(null);
        navigate('/admin/tenants');
      } catch (err) {
        const msg = err?.response?.data?.message || 'Erro ao excluir empresa';
        toast.error(msg);
      } finally {
        setDeleting(false);
      }
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!tenant) return null;

  const alerts = [];
  if (!tenant.active)
    alerts.push({ level: 'error', icon: XCircle, msg: 'Esta empresa está inativa.' });
  if ((tenant._count?.users || 0) === 0)
    alerts.push({ level: 'warning', icon: AlertTriangle, msg: 'Nenhum usuário cadastrado — onboarding pendente.' });
  if ((tenant.modules || []).filter(m => m.active).length === 0)
    alerts.push({ level: 'warning', icon: AlertTriangle, msg: 'Nenhum módulo ativo para esta empresa.' });

  const colorMap = {
    error:   'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info:    'bg-blue-50 border-blue-200 text-blue-600',
  };

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── Back + Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate('/admin/tenants')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para empresas
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={toggling}
            onClick={handleToggleStatus}
            className={tenant.active ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}
          >
            <Power className="w-3.5 h-3.5" />
            {tenant.active ? 'Desativar' : 'Reativar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={deleting}
            onClick={() => setModal('delete')}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </Button>
          <Link to={`/admin/tenants/${id}`}>
            <Button size="sm">
              <Pencil className="w-3.5 h-3.5" /> Editar empresa
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Hero header ── */}
      <div className="bg-card border rounded-2xl shadow-card overflow-hidden">
        <div className="h-2 w-full" style={{ backgroundColor: tenant.primaryColor || '#6366f1' }} />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          {tenant.logo ? (
            <img
              src={tenant.logo}
              alt={tenant.name}
              className="w-14 h-14 rounded-xl object-contain border bg-white shrink-0"
              style={{ backgroundColor: tenant.iconBgColor || '#fff' }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 text-white"
              style={{ backgroundColor: tenant.primaryColor || '#6366f1' }}
            >
              {tenant.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-foreground truncate">{tenant.name}</h1>
              <Badge variant={tenant.active ? 'success' : 'destructive'}>
                {tenant.active ? 'Ativo' : 'Inativo'}
              </Badge>
              <Badge variant="default">{PLAN_LABELS[tenant.plan] || tenant.plan}</Badge>
              {tenant.businessType && <Badge variant="outline">{BUSINESS_LABELS[tenant.businessType] || tenant.businessType}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">/{tenant.slug}</p>
          </div>
          {/* quick stats */}
          <div className="flex gap-4 shrink-0 text-center">
            {[
              { value: tenant._count?.users || 0, label: 'Usuários', icon: Users },
              { value: tenant._count?.clients || 0, label: 'Clientes', icon: Building2 },
              { value: tenant._count?.serviceOrders || 0, label: 'OS', icon: FileText },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-0.5 px-3 border-l first:border-l-0">
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <AlertBanner key={i} icon={a.icon} color={colorMap[a.level]}>{a.msg}</AlertBanner>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div>
        <div className="overflow-x-auto">
          <div className="flex gap-0.5 bg-muted/60 p-1 rounded-xl w-fit min-w-full sm:min-w-0">
            {TABS.map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${activeTab === tab.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          {activeTab === 'geral'     && <TabGeral t={tenant} />}
          {activeTab === 'plano'     && <TabPlano t={tenant} />}
          {activeTab === 'modulos'   && <TabModulos t={tenant} />}
          {activeTab === 'usuarios'  && <TabUsuarios t={tenant} />}
          {activeTab === 'contrato'  && <TabContrato t={tenant} onRefresh={load} />}
          {activeTab === 'auditoria' && <TabAuditoria t={tenant} />}
        </div>
      </div>

      <DestructiveModal
        open={!!modal}
        onClose={() => setModal(null)}
        onConfirm={handleModalConfirm}
        tenant={tenant}
        mode={modal || 'deactivate'}
        loading={toggling || deleting}
      />
    </div>
  );
}
