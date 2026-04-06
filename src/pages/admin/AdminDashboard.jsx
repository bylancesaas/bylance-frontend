import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Building2, Users, TrendingUp, TrendingDown, Plus, Activity,
  CheckCircle2, XCircle, UserX, ArrowRight, AlertTriangle,
  BarChart3, Layers, DollarSign, Clock, Flame,
  Filter, RefreshCw, Eye, Target, Zap, ShieldAlert, Timer,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── constants ────────────────────────────────────────────────────────────────
const MODULE_LABELS = {
  dashboard: 'Dashboard', clients: 'Clientes', items: 'Itens',
  services: 'Serviços', serviceOrders: 'Ordens de Serviço',
  warranties: 'Garantias', financial: 'Financeiro', userManagement: 'Usuários',
};
const PLAN_LABELS   = { basic: 'Básico', pro: 'Pro', enterprise: 'Enterprise', free: 'Grátis', trial: 'Trial' };
const STATUS_LABELS = { ativo: 'Ativo', trial: 'Trial', suspenso: 'Suspenso', cancelado: 'Cancelado', cortesia: 'Cortesia' };
const PLAN_PRICES   = { basic: 99, pro: 299, enterprise: 799, trial: 0, free: 0, cortesia: 0 };
const STATUS_COLORS = { ativo: '#00C897', trial: '#3b82f6', suspenso: '#f59e0b', cancelado: '#ef4444', cortesia: '#8b5cf6' };
const CHART_COLORS  = ['#00C897', '#0A1F44', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

// ── risk scoring ─────────────────────────────────────────────────────────────
function riskScore(t) {
  let s = 0;
  if (t.planStatus === 'cancelado') s += 100;
  else if (t.planStatus === 'suspenso') s += 80;
  if (t.planEndDate) {
    const d = Math.ceil((new Date(t.planEndDate) - new Date()) / 86400000);
    if (d < 0) s += 85;
    else if (d <= 7) s += 70;
    else if (d <= 14) s += 55;
    else if (d <= 30) s += 40;
  }
  if (t.planStatus === 'trial') {
    const days = Math.ceil((new Date() - new Date(t.createdAt)) / 86400000);
    s += days > 30 ? 45 : 20;
  }
  if ((t._count?.users || 0) === 0) s += 30;
  if (!t.logo) s += 5;
  return s;
}
function riskLabel(score) {
  if (score >= 80) return { label: 'Crítico',  cls: 'text-red-600    bg-red-50' };
  if (score >= 50) return { label: 'Alto',     cls: 'text-orange-600 bg-orange-50' };
  if (score >= 25) return { label: 'Médio',    cls: 'text-amber-600  bg-amber-50' };
  return               { label: 'Baixo',    cls: 'text-blue-600   bg-blue-50' };
}

// ── data builders ─────────────────────────────────────────────────────────────
function buildMonthlyEvolution(tenants, months) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d    = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const novas     = tenants.filter(t => { const td = new Date(t.createdAt); return td >= d && td < next; }).length;
    const acumulado = tenants.filter(t => new Date(t.createdAt) < next).length;
    const mrr = tenants
      .filter(t => new Date(t.createdAt) < next && t.active)
      .reduce((s, t) => s + (parseFloat(t.planValue) || PLAN_PRICES[t.plan] || 0), 0);
    return { mes: label, novas, acumulado, mrr: Math.round(mrr) };
  });
}

function buildPlanData(tenants) {
  const counts = {};
  tenants.forEach(t => { const p = t.plan || 'basic'; counts[p] = (counts[p] || 0) + 1; });
  return Object.entries(counts).map(([plan, value]) => ({ name: PLAN_LABELS[plan] || plan, value }));
}

function buildStatusData(tenants) {
  const counts = {};
  tenants.forEach(t => { const s = t.planStatus || 'ativo'; counts[s] = (counts[s] || 0) + 1; });
  return Object.entries(counts).map(([status, value]) => ({
    name: STATUS_LABELS[status] || status, value, color: STATUS_COLORS[status] || '#6b7280',
  }));
}

function buildModuleData(tenants) {
  const counts = {};
  tenants.forEach(t => (t.modules || []).forEach(m => { if (m.active) counts[m.module] = (counts[m.module] || 0) + 1; }));
  return Object.entries(counts)
    .map(([m, n]) => ({ modulo: MODULE_LABELS[m] || m, empresas: n }))
    .sort((a, b) => b.empresas - a.empresas).slice(0, 8);
}

function buildUserDistribution(tenants) {
  const bands = [
    { label: 'Nenhum', min: 0, max: 0 },
    { label: '1–3',    min: 1, max: 3 },
    { label: '4–10',   min: 4, max: 10 },
    { label: '11–20',  min: 11, max: 20 },
    { label: '21+',    min: 21, max: Infinity },
  ];
  return bands.map(b => ({
    label: b.label,
    count: tenants.filter(t => { const u = t._count?.users || 0; return u >= b.min && u <= b.max; }).length,
  }));
}

function buildOnboardingFunnel(tenants) {
  const total = tenants.length;
  if (!total) return [];
  const withModules = tenants.filter(t => (t.modules || []).some(m => m.active)).length;
  const withLogo    = tenants.filter(t => t.logo).length;
  const withUsers   = tenants.filter(t => (t._count?.users || 0) > 0).length;
  return [
    { step: 'Empresa criada',       count: total,       pct: 100 },
    { step: 'Módulos configurados', count: withModules, pct: Math.round((withModules / total) * 100) },
    { step: 'Logo enviada',         count: withLogo,    pct: Math.round((withLogo    / total) * 100) },
    { step: 'Usuário admin criado', count: withUsers,   pct: Math.round((withUsers   / total) * 100) },
  ];
}

function estimateMRR(tenants) {
  return Math.round(
    tenants
      .filter(t => t.active && t.planStatus === 'ativo')
      .reduce((s, t) => s + (parseFloat(t.planValue) || PLAN_PRICES[t.plan] || 0), 0)
  );
}

const fmtMRR = (v) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`;

const tooltipStyle = {
  fontSize: 12, borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
  boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
};

// ── SectionLabel ──────────────────────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 shrink-0">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ── ChartCard ─────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-card rounded-xl border shadow-card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>
      {children}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon: Icon, iconColor, iconBg, trendValue, onClick }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`bg-card rounded-xl border shadow-card p-5 group transition-all
        ${onClick ? 'cursor-pointer hover:shadow-elevated hover:border-primary/20 active:scale-[.99]' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 leading-tight">{title}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
      {(subtitle || trendValue !== undefined) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {trendValue !== undefined && (
            trendValue >= 0
              ? <TrendingUp  className="w-3 h-3 text-emerald-500 shrink-0" />
              : <TrendingDown className="w-3 h-3 text-red-500    shrink-0" />
          )}
          {subtitle && <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>}
        </div>
      )}
      {onClick && <ArrowRight className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground/40 mt-2 transition-all" />}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tenants,    setTenants]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterPlan,   setFilterPlan]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [months, setMonths] = useState(6);
  const navigate = useNavigate();

  const fetchData = useCallback((silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    api.get('/tenants')
      .then(res => setTenants(res.data.data || []))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered dataset ──────────────────────────────────────────────────────
  const filtered = useMemo(() => tenants.filter(t => {
    if (filterPlan   !== 'all' && t.plan       !== filterPlan)   return false;
    if (filterStatus !== 'all' && t.planStatus !== filterStatus) return false;
    return true;
  }), [tenants, filterPlan, filterStatus]);

  // ── Computed stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now  = new Date();
    const som  = new Date(now.getFullYear(), now.getMonth(), 1);
    const sopm = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const active    = filtered.filter(t => t.active && t.planStatus === 'ativo').length;
    const inactive  = filtered.filter(t => !t.active).length;
    const suspended = filtered.filter(t => t.planStatus === 'suspenso').length;
    const canceled  = filtered.filter(t => t.planStatus === 'cancelado').length;
    const trial     = filtered.filter(t => t.planStatus === 'trial').length;

    const newThisMonth = filtered.filter(t => new Date(t.createdAt) >= som).length;
    const newLastMonth = filtered.filter(t => { const d = new Date(t.createdAt); return d >= sopm && d < som; }).length;
    const growth = newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : null;

    const totalUsers         = filtered.reduce((s, t) => s + (t._count?.users || 0), 0);
    const noUsers            = filtered.filter(t => (t._count?.users || 0) === 0);
    const avgUsersPerCompany = filtered.length > 0 ? (totalUsers / filtered.length).toFixed(1) : 0;

    const expiringIn30 = filtered.filter(t => {
      if (!t.planEndDate) return false;
      const d = Math.ceil((new Date(t.planEndDate) - now) / 86400000);
      return d >= 0 && d <= 30;
    });

    const mrr     = estimateMRR(filtered);
    const mrrPrev = estimateMRR(filtered.filter(t => new Date(t.createdAt) < som));
    const mrrGrowth = mrrPrev > 0 ? Math.round(((mrr - mrrPrev) / mrrPrev) * 100) : null;

    const activeList = filtered.filter(t => t.active && t.planStatus === 'ativo');
    const avgTicket  = activeList.length > 0
      ? Math.round(activeList.reduce((s, t) => s + (parseFloat(t.planValue) || PLAN_PRICES[t.plan] || 0), 0) / activeList.length)
      : 0;

    const onboardingPending = filtered.filter(t => (t._count?.users || 0) === 0 && new Date(t.createdAt) >= sopm);

    const atRisk = filtered
      .map(t => ({ ...t, _score: riskScore(t) }))
      .filter(t => t._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 8);

    return {
      total: filtered.length, active, inactive, suspended, canceled, trial,
      newThisMonth, newLastMonth, growth,
      totalUsers, avgUsersPerCompany, noUsers, expiringIn30,
      mrr, mrrGrowth, avgTicket, onboardingPending, atRisk,
    };
  }, [filtered]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => buildMonthlyEvolution(filtered, months), [filtered, months]);
  const planData    = useMemo(() => buildPlanData(filtered),           [filtered]);
  const statusData  = useMemo(() => buildStatusData(filtered),         [filtered]);
  const moduleData  = useMemo(() => buildModuleData(filtered),         [filtered]);
  const userDist    = useMemo(() => buildUserDistribution(filtered),   [filtered]);
  const funnel      = useMemo(() => buildOnboardingFunnel(filtered),   [filtered]);

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list = [];
    if (stats.canceled > 0)
      list.push({ level: 'error', msg: `${stats.canceled} empresa${stats.canceled !== 1 ? 's' : ''} com plano cancelado` });
    if (stats.suspended > 0)
      list.push({ level: 'error', msg: `${stats.suspended} empresa${stats.suspended !== 1 ? 's' : ''} suspensa${stats.suspended !== 1 ? 's' : ''}` });
    if (stats.expiringIn30.length > 0)
      list.push({ level: 'warning', msg: `${stats.expiringIn30.length} plano${stats.expiringIn30.length !== 1 ? 's' : ''} vencendo nos próximos 30 dias` });
    if (stats.noUsers.length > 0)
      list.push({ level: 'warning', msg: `${stats.noUsers.length} empresa${stats.noUsers.length !== 1 ? 's' : ''} sem usuários cadastrados` });
    if (stats.trial > 0)
      list.push({ level: 'info', msg: `${stats.trial} empresa${stats.trial !== 1 ? 's' : ''} em período de trial` });
    if (stats.onboardingPending.length > 0)
      list.push({ level: 'info', msg: `${stats.onboardingPending.length} empresa${stats.onboardingPending.length !== 1 ? 's' : ''} com onboarding incompleto` });
    return list;
  }, [stats]);

  if (loading) return <LoadingSpinner />;

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const uniquePlans    = [...new Set(tenants.map(t => t.plan).filter(Boolean))];
  const uniqueStatuses = [...new Set(tenants.map(t => t.planStatus).filter(Boolean))];

  return (
    <div className="animate-fade-in space-y-6 pb-4">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-3 py-2 bg-card transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => navigate('/admin/tenants/new')}
            className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> Nova empresa
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-card rounded-xl border shadow-soft">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground font-medium mr-1">Filtros:</span>
        <select
          value={months}
          onChange={e => setMonths(Number(e.target.value))}
          className="h-8 py-0 text-xs rounded-lg border border-input bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Último ano</option>
        </select>
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="h-8 py-0 text-xs rounded-lg border border-input bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">Todos os planos</option>
          {uniquePlans.map(p => <option key={p} value={p}>{PLAN_LABELS[p] || p}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-8 py-0 text-xs rounded-lg border border-input bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">Todos os status</option>
          {uniqueStatuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
        </select>
        {(filterPlan !== 'all' || filterStatus !== 'all') && (
          <button
            onClick={() => { setFilterPlan('all'); setFilterStatus('all'); }}
            className="text-xs text-destructive hover:underline ml-1"
          >
            Limpar filtros
          </button>
        )}
        {filtered.length !== tenants.length && (
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} de {tenants.length} empresas
          </span>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          KPI LAYER — 3 sections: crescimento | saúde comercial | operação
      ══════════════════════════════════════════════════════════════════════ */}

      <SectionLabel label="Crescimento da base" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          title="Total empresas" value={stats.total}
          icon={Building2} iconColor="text-bylance-navy" iconBg="bg-bylance-navy/10"
          onClick={() => navigate('/admin/tenants')}
        />
        <KpiCard
          title="Ativas" value={stats.active}
          icon={CheckCircle2} iconColor="text-emerald-500" iconBg="bg-emerald-500/10"
          subtitle={`${stats.inactive} inativas`}
          onClick={() => navigate('/admin/tenants')}
        />
        <KpiCard
          title="Novas este mês" value={stats.newThisMonth}
          icon={TrendingUp} iconColor="text-primary" iconBg="bg-primary/10"
          subtitle={stats.growth !== null ? `${stats.growth >= 0 ? '+' : ''}${stats.growth}% vs mês anterior` : 'Primeiro mês'}
          trendValue={stats.growth}
          onClick={() => navigate('/admin/tenants')}
        />
        <KpiCard
          title="Vencendo em 30d" value={stats.expiringIn30.length}
          icon={Clock} iconColor="text-amber-500" iconBg="bg-amber-500/10"
          subtitle={stats.expiringIn30.length > 0 ? 'Requerem renovação' : 'Nenhum urgente'}
          onClick={() => navigate('/admin/tenants')}
        />
      </div>

      <SectionLabel label="Saúde comercial" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          title="MRR estimado" value={fmtMRR(stats.mrr)}
          icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-500/10"
          subtitle={stats.mrrGrowth !== null ? `${stats.mrrGrowth >= 0 ? '+' : ''}${stats.mrrGrowth}% vs mês anterior` : undefined}
          trendValue={stats.mrrGrowth}
        />
        <KpiCard
          title="Ticket médio" value={`R$${stats.avgTicket}`}
          icon={Target} iconColor="text-cyan-500" iconBg="bg-cyan-500/10"
          subtitle="Por empresa ativa"
        />
        <KpiCard
          title="Em trial" value={stats.trial}
          icon={Timer} iconColor="text-blue-500" iconBg="bg-blue-500/10"
          subtitle={stats.trial > 0 ? 'Potencial de conversão' : 'Nenhum em trial'}
          onClick={() => navigate('/admin/tenants')}
        />
        <KpiCard
          title="Em risco" value={stats.suspended + stats.canceled}
          icon={ShieldAlert} iconColor="text-red-500" iconBg="bg-red-500/10"
          subtitle={`${stats.suspended} suspenso${stats.suspended !== 1 ? 's' : ''}, ${stats.canceled} cancelado${stats.canceled !== 1 ? 's' : ''}`}
          onClick={() => navigate('/admin/tenants')}
        />
      </div>

      <SectionLabel label="Usuários & operação" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          title="Total usuários" value={stats.totalUsers}
          icon={Users} iconColor="text-violet-500" iconBg="bg-violet-500/10"
        />
        <KpiCard
          title="Média por empresa" value={stats.avgUsersPerCompany}
          icon={Activity} iconColor="text-sky-500" iconBg="bg-sky-500/10"
          subtitle="Usuários / empresa"
        />
        <KpiCard
          title="Sem usuários" value={stats.noUsers.length}
          icon={UserX} iconColor="text-amber-500" iconBg="bg-amber-500/10"
          subtitle={stats.noUsers.length > 0 ? 'Ação necessária' : 'Tudo em dia'}
          onClick={() => navigate('/admin/tenants')}
        />
        <KpiCard
          title="Onboarding pendente" value={stats.onboardingPending.length}
          icon={Zap} iconColor="text-orange-500" iconBg="bg-orange-500/10"
          subtitle="Novos sem admin criado"
          onClick={() => navigate('/admin/tenants')}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CHARTS ROW 1 — Evolução (2 cols) + Planos (1 col)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          className="lg:col-span-2"
          title="Evolução da base"
          subtitle={`Novas e acumulado — últimos ${months} meses`}
          icon={BarChart3}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradNovas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00C897" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00C897" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0A1F44" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0A1F44" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="#0A1F44" strokeWidth={1.5} fill="url(#gradAcum)" dot={false} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="novas"     name="Novas"     stroke="#00C897" strokeWidth={2}   fill="url(#gradNovas)"  dot={{ r: 3, fill: '#00C897', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição por plano" subtitle="Empresas por tipo" icon={Layers}>
          {planData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="44%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                  {planData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CHARTS ROW 2 — Status (1 col) + Módulos (2 cols)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Status dos planos" subtitle="Situação contratual">
          {statusData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Empresas" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-2" title="Módulos mais ativos" subtitle="Empresas com módulo habilitado" icon={Layers}>
          {moduleData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={moduleData.length * 26 + 20}>
              <BarChart data={moduleData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="modulo" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={140} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="empresas" name="Empresas" fill="#00C897" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CHARTS ROW 3 — Distribuição de usuários + Funil de onboarding
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Distribuição de usuários" subtitle="Empresas por faixa de usuários" icon={Users}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userDist} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Empresas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Funil de onboarding" subtitle="Progresso das empresas na configuração inicial">
          {funnel.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <div className="space-y-4 pt-1">
              {funnel.map((step, i) => {
                const barColor = i === 0 ? '#0A1F44'
                  : step.pct >= 75 ? '#00C897'
                  : step.pct >= 50 ? '#f59e0b'
                  : '#ef4444';
                return (
                  <div key={step.step} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: barColor }}>
                          {i + 1}
                        </div>
                        <span className="font-medium text-foreground">{step.step}</span>
                      </div>
                      <span className="font-black text-foreground tabular-nums">
                        {step.count} <span className="text-muted-foreground font-normal">({step.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${step.pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ATTENTION TABLE — companies at risk
      ══════════════════════════════════════════════════════════════════════ */}
      {stats.atRisk.length > 0 && (
        <>
          <SectionLabel label="Empresas que precisam de atenção" />
          <div className="bg-card rounded-xl border shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-foreground">Painel de risco</h3>
                <span className="text-xs text-muted-foreground">— {stats.atRisk.length} prioritária{stats.atRisk.length !== 1 ? 's' : ''}</span>
              </div>
              <button onClick={() => navigate('/admin/tenants')} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {stats.atRisk.map(t => {
                const { label, cls } = riskLabel(t._score);
                const daysLeft = t.planEndDate
                  ? Math.ceil((new Date(t.planEndDate) - new Date()) / 86400000)
                  : null;
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-primary/[0.03] transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/tenants/${t.id}/detail`)}
                  >
                    {t.logo
                      ? <img src={t.logo} alt="" className="w-8 h-8 rounded-lg object-contain bg-white border shrink-0 p-0.5" />
                      : <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {t.name?.[0]?.toUpperCase() || '?'}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {PLAN_LABELS[t.plan] || t.plan}
                        {' · '}{STATUS_LABELS[t.planStatus] || t.planStatus}
                        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && ` · vence em ${daysLeft}d`}
                        {daysLeft !== null && daysLeft < 0 && ' · plano vencido'}
                        {(t._count?.users || 0) === 0 && ' · sem usuários'}
                      </p>
                    </div>
                    <div className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{label}</div>
                    <div className="text-xs text-muted-foreground/60 font-mono shrink-0 hidden sm:block">{t._score}pt</div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM — Alerts + Quick actions
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">
        {/* Alerts */}
        <div className="bg-card rounded-xl border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Alertas</h3>
            {alerts.length > 0 && (
              <span className="ml-auto text-xs bg-amber-50 text-amber-600 font-semibold px-2 py-0.5 rounded-full">{alerts.length}</span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Nenhum alerta crítico no momento
            </div>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li key={i}>
                  <button
                    onClick={() => navigate('/admin/tenants')}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors
                      ${a.level === 'error'   ? 'bg-red-500/8    text-red-600    hover:bg-red-500/14'   :
                        a.level === 'warning' ? 'bg-amber-500/8  text-amber-700  hover:bg-amber-500/14' :
                                                'bg-blue-500/8   text-blue-600   hover:bg-blue-500/14'}`}
                  >
                    <span>{a.msg}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-card rounded-xl border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Ações rápidas</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Nova empresa',        icon: Plus,        color: 'text-primary',    bg: 'bg-primary/10',        path: '/admin/tenants/new' },
              { label: 'Ver todas empresas',  icon: Eye,         color: 'text-blue-500',   bg: 'bg-blue-500/10',       path: '/admin/tenants' },
              { label: 'Empresas em risco',   icon: ShieldAlert, color: 'text-red-500',    bg: 'bg-red-500/10',        path: '/admin/tenants' },
              { label: 'Sem usuários',        icon: UserX,       color: 'text-amber-500',  bg: 'bg-amber-500/10',      path: '/admin/tenants' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-sm font-medium text-left"
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${action.bg}`}>
                  <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
                </div>
                <span className="leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
