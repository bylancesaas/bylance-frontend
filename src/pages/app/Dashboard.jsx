import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTenant } from '@/contexts/TenantContext';
import {
  DollarSign, Shield, Users, ClipboardList,
  ChevronRight, TrendingUp, TrendingDown,
  Sparkles, AlertTriangle, Wrench, Package,
  UserPlus, BarChart3, Star,
} from 'lucide-react';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function KpiCard({ title, value, sub, icon: Icon, color }) {
  const colors = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-950/30',   icon: 'bg-blue-100 text-blue-600',     text: 'text-blue-600' },
    green:  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-600' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'bg-violet-100 text-violet-600', text: 'text-violet-600' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-950/30',  icon: 'bg-amber-100 text-amber-600',   text: 'text-amber-600' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`rounded-xl border shadow-card p-5 ${c.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-2xl font-bold tracking-tight ${c.text}`}>{value}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

const businessCopy = {
  auto:        { osTitle: 'Tem um veículo esperando na fila?',   osDesc: 'Abra uma nova OS e coloque a oficina em movimento.' },
  oficina:     { osTitle: 'Tem um veículo esperando na fila?',   osDesc: 'Abra uma nova OS e coloque a oficina em movimento.' },
  estetica:    { osTitle: 'Tem um atendimento agendado?',        osDesc: 'Abra uma nova OS e registre o serviço do cliente.' },
  informatica: { osTitle: 'Tem um equipamento na fila?',         osDesc: 'Abra uma nova OS e registre o reparo ou serviço.' },
  eletrica:    { osTitle: 'Tem um serviço elétrico pendente?',   osDesc: 'Abra uma nova OS e organize o atendimento.' },
  geral:       { osTitle: 'Tem um serviço para registrar?',      osDesc: 'Abra uma nova ordem de serviço e organize o atendimento.' },
};

function getBusinessCopy(businessType) {
  return businessCopy[businessType] || businessCopy.geral;
}

function ActionCard({ icon: Icon, title, description, cta, to, gradient, onClick }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={onClick || (() => navigate(to))}
      className={`group text-left w-full rounded-xl p-5 text-white relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-elevated active:scale-[0.99] ${gradient}`}
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
      <div className="absolute -right-2 bottom-3 w-16 h-16 rounded-full bg-white/5" />

      <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-base font-bold leading-snug mb-1">{title}</p>
      <p className="text-xs text-white/75 leading-relaxed mb-4">{description}</p>
      <div className="flex items-center gap-1 text-xs font-semibold">
        {cta} <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { tenant } = useTenant();
  const [stats, setStats] = useState({ orders: 0, pendingOrders: 0, clients: 0, warranties: 0, revenue: 0, expenses: 0, stock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, clientsRes, warrantiesRes, summaryRes, itemsRes] = await Promise.all([
          api.get('/service-orders').catch(() => ({ data: { data: [] } })),
          api.get('/clients').catch(() => ({ data: { data: [] } })),
          api.get('/warranties').catch(() => ({ data: { data: [] } })),
          api.get('/financial/summary').catch(() => ({ data: { data: { totalRevenue: 0, totalExpenses: 0 } } })),
          api.get('/items').catch(() => ({ data: { data: [] } })),
        ]);
        const orders = ordersRes.data.data || [];
        const pending = orders.filter(o => o.status === 'pending' || o.status === 'in_progress').length;
        const activeWarranties = (warrantiesRes.data.data || []).filter(w => w.status === 'active').length;
        setStats({
          orders: orders.length,
          pendingOrders: pending,
          clients: clientsRes.data.data?.length || 0,
          warranties: activeWarranties,
          revenue: summaryRes.data.data?.totalRevenue || 0,
          expenses: summaryRes.data.data?.totalExpenses || 0,
          stock: itemsRes.data.data?.length || 0,
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const navigate = useNavigate();
  if (loading) return <LoadingSpinner />;

  const profit = stats.revenue - stats.expenses;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const tenantName = tenant?.name || 'sua empresa';
  const copy = getBusinessCopy(tenant?.businessType);

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <PageHeader
          title={`${greeting}!!`}
          description={`Aqui está o resumo de ${tenantName} por hoje.`}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard title="OS em aberto" value={stats.pendingOrders} sub={`${stats.orders} ordens no total`} icon={ClipboardList} color="blue" />
        <KpiCard title="Clientes ativos" value={stats.clients} sub="no portfólio" icon={Users} color="violet" />
        <KpiCard title="Faturamento" value={fmt(stats.revenue)} sub={profit >= 0 ? `Lucro: ${fmt(profit)}` : `Déficit: ${fmt(Math.abs(profit))}`} icon={profit >= 0 ? TrendingUp : TrendingDown} color="green" />
        <KpiCard title="Garantias ativas" value={stats.warranties} sub="em vigência" icon={Shield} color="amber" />
      </div>

      {/* Action widgets */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Atalhos rápidos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard icon={Wrench} title={copy.osTitle} description={copy.osDesc} cta="Criar nova OS" to="/service-orders" gradient="bg-gradient-to-br from-blue-600 to-blue-500" />
          <ActionCard icon={UserPlus} title="Novo cliente bateu na porta?" description="Registre o contato, construa histórico e entregue uma experiência personalizada." cta="Cadastrar cliente" to="/clients" gradient="bg-gradient-to-br from-violet-600 to-purple-500" />
          <ActionCard icon={TrendingUp} title="Serviço fechado — e o caixa?" description="Lance a receita antes que o dia feche. Cada real registrado conta pra análise." cta="Ver financeiro" to="/financial" gradient="bg-gradient-to-br from-emerald-600 to-teal-500" />
          <ActionCard icon={Package} title="As peças estão no limite?" description="Cheque o estoque, atualize quantidades e evite surpresas na hora da OS." cta="Ver estoque" to="/items" gradient="bg-gradient-to-br from-orange-500 to-amber-500" />
          <ActionCard icon={Shield} title="Garantia para cada cliente satisfeito" description={stats.warranties > 0 ? `Você tem ${stats.warranties} garantia${stats.warranties > 1 ? 's' : ''} ativa${stats.warranties > 1 ? 's' : ''}. Fique de olho nos prazos.` : 'Emita garantias para os serviços concluídos e reforce a confiança do cliente.'} cta="Ver garantias" to="/warranties" gradient="bg-gradient-to-br from-rose-500 to-pink-500" />
          <ActionCard icon={BarChart3} title="Como está o desempenho real?" description={`Receita total: ${fmt(stats.revenue)}. Acesse o financeiro e enxergue o negócio inteiro de uma vez.`} cta="Analisar números" to="/financial" gradient="bg-gradient-to-br from-slate-600 to-slate-500" />
        </div>
      </div>

      {/* Mini info bar */}
      {stats.pendingOrders > 0 && (
        <button
          onClick={() => navigate('/service-orders')}
          className="w-full flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-5 py-3.5 text-left group hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              {stats.pendingOrders} ordem{stats.pendingOrders > 1 ? 's' : ''} aguardando atenção
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-500 ml-2">Clique para ver as OS em aberto</span>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}
