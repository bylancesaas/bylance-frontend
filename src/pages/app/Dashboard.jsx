import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '@/api/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { useSensitiveValues } from '@/lib/sensitiveValues';
import {
  DollarSign, Shield, Users, ClipboardList,
  ChevronRight, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Wrench, Package,
  UserPlus, BarChart3,
  Sparkles, ArrowRight, PlusCircle, Clock, Star,
  Eye, EyeOff,
} from 'lucide-react';

// ── Formatters ───────────────────────────────────────────────────────────────
const fmtBRL = (v) =>
  `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtShortBRL = (v) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${(v || 0).toFixed(0)}`;
};
const fmtAxisY = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const OS_STATUS_CONFIG = {
  pending:     { label: 'Aguardando', color: '#f59e0b' },
  in_progress: { label: 'Em andamento', color: '#3b82f6' },
  completed:   { label: 'Concluída', color: '#10b981' },
  cancelled:   { label: 'Cancelada', color: '#ef4444' },
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
// Reads data — NOT an action card
const ACCENT_STYLES = {
  amber:  { icon: 'text-amber-600 bg-amber-100',    ring: 'border-amber-100' },
  green:  { icon: 'text-emerald-600 bg-emerald-100', ring: 'border-emerald-100' },
  blue:   { icon: 'text-blue-600 bg-blue-100',      ring: 'border-blue-100' },
  purple: { icon: 'text-violet-600 bg-violet-100',  ring: 'border-violet-100' },
  red:    { icon: 'text-rose-600 bg-rose-100',      ring: 'border-rose-100' },
  slate:  { icon: 'text-slate-500 bg-slate-100',    ring: 'border-slate-100' },
};

function KpiCard({ title, value, sub, icon: Icon, trend, trendLabel, accent = 'blue', onClick }) {
  const a = ACCENT_STYLES[accent] || ACCENT_STYLES.blue;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-500' : 'text-slate-400';

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-xl border ${a.ring} p-4 transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-primary/20' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${a.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{trendLabel}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums text-foreground leading-tight mb-0.5">{value}</p>
      <p className="text-[13px] font-medium text-foreground/80 leading-snug">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{sub}</p>}
    </div>
  );
}

// ── Quick Action Row ──────────────────────────────────────────────────────────
// Clearly an action, not a KPI
function QuickAction({ icon: Icon, title, description, cta, to }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="group w-full flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/30 hover:bg-primary/[0.04] hover:shadow-sm transition-all duration-150 active:scale-[0.99]"
    >
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pl-2">
        {cta} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

// ── Alert Item ────────────────────────────────────────────────────────────────
const ALERT_STYLES = {
  warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  danger:  'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  info:    'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
};

function AlertItem({ icon: Icon, title, sub, severity = 'warning', onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${ALERT_STYLES[severity]}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-60" />
    </button>
  );
}

// ── Chart Tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-elevated px-3 py-2 text-xs">
      {label && <p className="font-semibold text-foreground mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard Component ──────────────────────────────────────────────────
export default function Dashboard() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { isVisible: isValuesVisible, toggleVisibility: toggleValuesVisibility } = useSensitiveValues(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [financials, setFinancials] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [ordersRes, clientsRes, warrantiesRes, financialsRes, itemsRes] = await Promise.all([
          api.get('/service-orders').catch(() => ({ data: { data: [] } })),
          api.get('/clients').catch(() => ({ data: { data: [] } })),
          api.get('/warranties').catch(() => ({ data: { data: [] } })),
          api.get('/financial').catch(() => ({ data: { data: [] } })),
          api.get('/items').catch(() => ({ data: { data: [] } })),
        ]);
        setOrders(ordersRes.data.data || []);
        setClients(clientsRes.data.data || []);
        setWarranties(warrantiesRes.data.data || []);
        setFinancials(financialsRes.data.data || []);
        setItems(itemsRes.data.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // ── Service Orders ──────────────────────────────────────────────────────
    const openOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_progress');
    const completedToday = orders.filter(o => {
      if (o.status !== 'completed' || !o.completedAt) return false;
      return new Date(o.completedAt) >= todayStart;
    });
    const completedAll = orders.filter(o => o.status === 'completed');
    const lateOrders = openOrders.filter(o => {
      const diff = (now - new Date(o.createdAt)) / (1000 * 60 * 60 * 24);
      return diff > 7;
    });

    // OS by status (for chart)
    const statusMap = {};
    orders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    const osStatusData = Object.entries(statusMap)
      .filter(([key]) => OS_STATUS_CONFIG[key])
      .map(([key, count]) => ({ name: OS_STATUS_CONFIG[key].label, value: count, color: OS_STATUS_CONFIG[key].color }));

    // ── Financial ───────────────────────────────────────────────────────────
    const sumRevenue = (list) => list.filter(f => f.type === 'revenue').reduce((s, f) => s + f.value, 0);
    const sumExpenses = (list) => list.filter(f => f.type === 'expense').reduce((s, f) => s + f.value, 0);

    const inRange = (f, from, to) => {
      const d = new Date(f.date);
      return d >= from && (!to || d <= to);
    };

    const todayFinancials = financials.filter(f => inRange(f, todayStart));
    const monthFinancials = financials.filter(f => inRange(f, monthStart));
    const lastMonthFinancials = financials.filter(f => inRange(f, lastMonthStart, lastMonthEnd));

    const monthRevenue = sumRevenue(monthFinancials);
    const monthExpenses = sumExpenses(monthFinancials);
    const lastMonthRevenue = sumRevenue(lastMonthFinancials);

    // Revenue trend vs last month
    const revTrend = lastMonthRevenue > 0
      ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

    // Ticket médio
    const ticketMedio = completedAll.length > 0
      ? completedAll.reduce((s, o) => s + (o.total || 0), 0) / completedAll.length
      : 0;

    // ── Financial chart — last 6 months ────────────────────────────────────
    const chartMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const slice = financials.filter(f => inRange(f, d, end));
      return {
        month: MONTH_LABELS[d.getMonth()],
        Receitas: Math.round(sumRevenue(slice)),
        Despesas: Math.round(sumExpenses(slice)),
      };
    });

    // ── Warranties ──────────────────────────────────────────────────────────
    const activeWarranties = warranties.filter(w => w.status === 'active');
    const warrantiesExpiringSoon = activeWarranties.filter(w => new Date(w.endDate) <= in7Days);

    // ── Items ───────────────────────────────────────────────────────────────
    const criticalItems = items.filter(i => i.stockQuantity === 0);
    const lowStockItems = items.filter(i => i.stockQuantity > 0 && i.stockQuantity <= 5);

    return {
      openOrders: openOrders.length,
      completedToday: completedToday.length,
      totalClients: clients.length,
      todayRevenue: sumRevenue(todayFinancials),
      monthRevenue,
      monthExpenses,
      monthProfit: monthRevenue - monthExpenses,
      revTrend,
      ticketMedio,
      activeWarranties: activeWarranties.length,
      warrantiesExpiringSoon: warrantiesExpiringSoon.length,
      criticalItems: criticalItems.length,
      lowStockItems: lowStockItems.length,
      lateOrders: lateOrders.length,
      osStatusData,
      chartMonths,
    };
  }, [orders, clients, warranties, financials, items]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hiddenMoneyLabel = 'R$ *****';
  const formatMoney = (value) => (isValuesVisible ? fmtBRL(value) : hiddenMoneyLabel);

  if (loading) return <LoadingSpinner />;

  const hasAlerts = stats.lateOrders > 0 || stats.warrantiesExpiringSoon > 0 || stats.criticalItems > 0 || stats.openOrders > 0;

  return (
    <div className="animate-fade-in space-y-6 pb-2">

      {/* ── Greeting (compact) ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground leading-snug">
            {greeting}, {tenant?.name}! 👋
          </h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleValuesVisibility}
            aria-label={isValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
            title={isValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
            className="h-8 w-8"
          >
            {isValuesVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          {stats.lateOrders > 0 && (
            <button
              onClick={() => navigate('/service-orders')}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors flex-shrink-0"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {stats.lateOrders} OS atrasada{stats.lateOrders > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          title="OS em aberto"
          value={stats.openOrders}
          sub={`${orders.length} no total`}
          icon={ClipboardList}
          accent="amber"
          onClick={() => navigate('/service-orders')}
        />
        <KpiCard
          title="Concluídas hoje"
          value={stats.completedToday}
          sub="ordens finalizadas"
          icon={Wrench}
          accent="green"
          onClick={() => navigate('/service-orders')}
        />
        <KpiCard
          title="Receita do mês"
          value={formatMoney(stats.monthRevenue)}
          sub={stats.monthProfit >= 0
            ? `Resultado: ${formatMoney(stats.monthProfit)}`
            : `Déficit: ${formatMoney(Math.abs(stats.monthProfit))}`}
          icon={stats.monthProfit >= 0 ? TrendingUp : TrendingDown}
          accent={stats.monthProfit >= 0 ? 'green' : 'red'}
          trend={stats.revTrend !== null ? Math.sign(stats.revTrend) : undefined}
          trendLabel={stats.revTrend !== null ? `${Math.abs(stats.revTrend)}% vs mês ant.` : undefined}
          onClick={() => navigate('/financial')}
        />
        <KpiCard
          title="Receita de hoje"
          value={formatMoney(stats.todayRevenue)}
          sub="entradas registradas"
          icon={DollarSign}
          accent="blue"
          onClick={() => navigate('/financial')}
        />
        <KpiCard
          title="Clientes ativos"
          value={stats.totalClients}
          sub="no portfólio"
          icon={Users}
          accent="blue"
          onClick={() => navigate('/clients')}
        />
        <KpiCard
          title="Ticket médio"
          value={formatMoney(stats.ticketMedio)}
          sub="por OS concluída"
          icon={Star}
          accent="purple"
        />
        <KpiCard
          title="Garantias ativas"
          value={stats.activeWarranties}
          sub={stats.warrantiesExpiringSoon > 0
            ? `${stats.warrantiesExpiringSoon} vencem em 7 dias`
            : 'em vigência'}
          icon={Shield}
          accent={stats.warrantiesExpiringSoon > 0 ? 'amber' : 'slate'}
          onClick={() => navigate('/warranties')}
        />
        <KpiCard
          title="Estoque crítico"
          value={stats.criticalItems + stats.lowStockItems}
          sub={stats.criticalItems > 0
            ? `${stats.criticalItems} sem estoque`
            : 'itens com baixa quantidade'}
          icon={Package}
          accent={stats.criticalItems > 0 ? 'red' : 'slate'}
          onClick={() => navigate('/items')}
        />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Financial evolution — 3 cols */}
        <div className="lg:col-span-3 bg-card rounded-xl border p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Desempenho financeiro</h2>
            <p className="text-xs text-muted-foreground">Receitas e despesas — últimos 6 meses</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.chartMonths} barCategoryGap="28%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtAxisY}
                width={42}
              />
              <ReTooltip
                content={<ChartTooltip formatter={(v) => formatMoney(v)} />}
                cursor={{ fill: 'hsl(var(--muted) / 0.5)', radius: 4 }}
              />
              <Bar name="Receitas" dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar name="Despesas" dataKey="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-emerald-500 flex-shrink-0" />
              Receitas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-rose-400 flex-shrink-0" />
              Despesas
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              Despesas do mês: <span className="font-semibold text-foreground">{formatMoney(stats.monthExpenses)}</span>
            </div>
          </div>
        </div>

        {/* OS by status — 2 cols */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">OS por status</h2>
            <p className="text-xs text-muted-foreground">Distribuição atual das ordens</p>
          </div>
          {stats.osStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={stats.osStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={72}
                    dataKey="value"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {stats.osStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip
                    content={<ChartTooltip />}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {stats.osStatusData.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="truncate">
                      {s.name}: <span className="font-semibold text-foreground">{s.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-44 text-muted-foreground">
              <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs">Nenhuma OS registrada</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions + Alerts ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Quick Actions — 3 cols */}
        <div className="lg:col-span-3 bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Ações rápidas</h2>
          </div>
          <div className="space-y-1.5">
            <QuickAction
              icon={PlusCircle}
              title="Nova ordem de serviço"
              description="Abra uma OS para iniciar ou registrar atendimento"
              cta="Criar"
              to="/service-orders"
            />
            <QuickAction
              icon={UserPlus}
              title="Cadastrar cliente"
              description="Adicione um novo cliente ao portfólio"
              cta="Cadastrar"
              to="/clients"
            />
            <QuickAction
              icon={DollarSign}
              title="Lançar receita ou despesa"
              description="Registre movimentações financeiras do dia"
              cta="Lançar"
              to="/financial"
            />
            <QuickAction
              icon={Package}
              title="Consultar estoque"
              description="Veja itens, quantidades e preços cadastrados"
              cta="Ver"
              to="/items"
            />
            <QuickAction
              icon={Shield}
              title="Emitir garantia"
              description="Gere garantias para serviços concluídos"
              cta="Acessar"
              to="/warranties"
            />
          </div>
        </div>

        {/* Alerts & Pending — 2 cols */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-md bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Alertas e pendências</h2>
          </div>
          <div className="space-y-2">
            {stats.lateOrders > 0 && (
              <AlertItem
                icon={Clock}
                title={`${stats.lateOrders} OS atrasada${stats.lateOrders > 1 ? 's' : ''}`}
                sub="Abertas há mais de 7 dias sem conclusão"
                severity="warning"
                onClick={() => navigate('/service-orders')}
              />
            )}
            {stats.warrantiesExpiringSoon > 0 && (
              <AlertItem
                icon={Shield}
                title={`${stats.warrantiesExpiringSoon} garantia${stats.warrantiesExpiringSoon > 1 ? 's' : ''} vencendo`}
                sub="Expiram nos próximos 7 dias"
                severity="warning"
                onClick={() => navigate('/warranties')}
              />
            )}
            {stats.criticalItems > 0 && (
              <AlertItem
                icon={Package}
                title={`${stats.criticalItems} ${stats.criticalItems > 1 ? 'itens' : 'item'} sem estoque`}
                sub="Estoque zerado — reposição urgente"
                severity="danger"
                onClick={() => navigate('/items')}
              />
            )}
            {stats.lowStockItems > 0 && (
              <AlertItem
                icon={Package}
                title={`${stats.lowStockItems} ${stats.lowStockItems > 1 ? 'itens' : 'item'} com estoque baixo`}
                sub="Quantidade igual ou abaixo de 5 unidades"
                severity="info"
                onClick={() => navigate('/items')}
              />
            )}
            {stats.openOrders > 0 && stats.lateOrders === 0 && (
              <AlertItem
                icon={ClipboardList}
                title={`${stats.openOrders} OS aguardando atendimento`}
                sub="Pendentes ou em andamento"
                severity="info"
                onClick={() => navigate('/service-orders')}
              />
            )}
            {!hasAlerts && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <Star className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-foreground">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground mt-1">Sem alertas ou pendências no momento.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

