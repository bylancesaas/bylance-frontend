import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTenant } from '@/contexts/TenantContext';
import {
  BedDouble, CalendarDays, Users, Sparkles, DoorOpen,
  ChevronRight, TrendingUp, AlertTriangle, UserPlus,
  ClipboardList,
} from 'lucide-react';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function KpiCard({ title, value, sub, icon: Icon, color }) {
  const colors = {
    teal:  { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-700',    text: 'text-teal-700' },
    navy:  { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-800',    text: 'text-blue-800' },
    slate: { bg: 'bg-slate-50',  icon: 'bg-slate-100 text-slate-600',  text: 'text-slate-700' },
    amber: { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-700',  text: 'text-amber-700' },
  };
  const c = colors[color] || colors.teal;
  return (
    <div className={`rounded-xl border shadow-card p-5 ${c.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.icon}`}><Icon className="w-5 h-5" /></div>
        <span className={`text-2xl font-bold tracking-tight ${c.text}`}>{value}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, cta, to, gradient }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)} className={`group text-left w-full rounded-xl p-5 text-white relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-elevated active:scale-[0.99] ${gradient}`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
      <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center mb-3"><Icon className="w-5 h-5" /></div>
      <p className="text-base font-bold leading-snug mb-1">{title}</p>
      <p className="text-xs text-white/75 leading-relaxed mb-4">{description}</p>
      <div className="flex items-center gap-1 text-xs font-semibold">{cta} <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></div>
    </button>
  );
}

export default function HotelDashboard() {
  const { tenant } = useTenant();
  const [stats, setStats] = useState({ rooms: 0, available: 0, occupied: 0, reservations: 0, todayIn: 0, todayOut: 0, guests: 0, pendingHK: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [roomsRes, resRes, guestsRes, hkRes, finRes] = await Promise.all([
          api.get('/rooms').catch(() => ({ data: { data: [] } })),
          api.get('/reservations').catch(() => ({ data: { data: [] } })),
          api.get('/guests').catch(() => ({ data: { data: [] } })),
          api.get('/housekeeping').catch(() => ({ data: { data: [] } })),
          api.get('/financial/summary').catch(() => ({ data: { data: { totalRevenue: 0 } } })),
        ]);
        const rooms = roomsRes.data.data || [];
        const reservations = resRes.data.data || [];
        const hk = hkRes.data.data || [];
        const today = new Date().toISOString().slice(0, 10);
        const todayIn = reservations.filter(r => r.checkIn?.slice(0, 10) === today && r.status === 'confirmed').length;
        const todayOut = reservations.filter(r => r.checkOut?.slice(0, 10) === today && r.status === 'checked_in').length;
        setStats({
          rooms: rooms.length,
          available: rooms.filter(r => r.status === 'available').length,
          occupied: rooms.filter(r => r.status === 'occupied').length,
          reservations: reservations.filter(r => r.status === 'confirmed' || r.status === 'checked_in').length,
          todayIn,
          todayOut,
          guests: (guestsRes.data.data || []).length,
          pendingHK: hk.filter(t => t.status === 'pending').length,
          revenue: finRes.data.data?.totalRevenue || 0,
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const occupancy = stats.rooms > 0 ? Math.round((stats.occupied / stats.rooms) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader title={`${greeting}!!`} description={`Resumo de ${tenant?.name || 'seu hotel'} hoje.`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard title="Quartos disponíveis" value={stats.available} sub={`${stats.rooms} total • ${occupancy}% ocupação`} icon={DoorOpen} color="teal" />
        <KpiCard title="Reservas ativas" value={stats.reservations} sub={`${stats.todayIn} check-in hoje`} icon={CalendarDays} color="navy" />
        <KpiCard title="Hóspedes" value={stats.guests} sub="cadastrados" icon={Users} color="slate" />
        <KpiCard title="Faturamento" value={fmt(stats.revenue)} sub={`${stats.todayOut} check-out hoje`} icon={TrendingUp} color="amber" />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-primary" /><h2 className="text-sm font-semibold text-foreground">Atalhos rápidos</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard icon={CalendarDays} title="Nova reserva" description="Registre a próxima hospedagem — hóspede, quarto, datas e valor." cta="Criar reserva" to="/reservations" gradient="bg-gradient-to-br from-[#0A1F44] to-[#122960]" />
          <ActionCard icon={UserPlus} title="Novo hóspede" description="Cadastre o hóspede com documento, contato e preferências." cta="Cadastrar" to="/guests" gradient="bg-gradient-to-br from-[#0A1F44] to-[#007A5A]" />
          <ActionCard icon={BedDouble} title="Mapa de quartos" description={`${stats.available} quarto${stats.available !== 1 ? 's' : ''} disponíve${stats.available !== 1 ? 'is' : 'l'} agora.`} cta="Ver quartos" to="/rooms" gradient="bg-gradient-to-br from-[#00C897] to-[#008F6B]" />
          <ActionCard icon={Sparkles} title="Governança" description={stats.pendingHK > 0 ? `${stats.pendingHK} tarefa${stats.pendingHK > 1 ? 's' : ''} pendente${stats.pendingHK > 1 ? 's' : ''} de limpeza.` : 'Todas as tarefas em dia!'} cta="Ver tarefas" to="/housekeeping" gradient="bg-gradient-to-br from-[#4A4A4A] to-[#2d2d2d]" />
          <ActionCard icon={TrendingUp} title="Financeiro" description="Acompanhe receita, despesas e lucratividade do hotel." cta="Ver números" to="/financial" gradient="bg-gradient-to-br from-[#008F6B] to-[#0A1F44]" />
          <ActionCard icon={ClipboardList} title="Tipos de quarto" description="Configure categorias, preços e comodidades dos quartos." cta="Gerenciar tipos" to="/room-types" gradient="bg-gradient-to-br from-[#1a3a7a] to-[#0A1F44]" />
        </div>
      </div>

      {(stats.todayIn > 0 || stats.todayOut > 0 || stats.pendingHK > 0) && (
        <div className="space-y-2">
          {stats.todayIn > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3.5"><CalendarDays className="w-4 h-4 text-blue-500 shrink-0" /><span className="text-sm font-semibold text-blue-800">{stats.todayIn} check-in{stats.todayIn > 1 ? 's' : ''} previsto{stats.todayIn > 1 ? 's' : ''} para hoje</span></div>
          )}
          {stats.todayOut > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /><span className="text-sm font-semibold text-amber-800">{stats.todayOut} check-out{stats.todayOut > 1 ? 's' : ''} pendente{stats.todayOut > 1 ? 's' : ''} hoje</span></div>
          )}
          {stats.pendingHK > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-3.5"><Sparkles className="w-4 h-4 text-orange-500 shrink-0" /><span className="text-sm font-semibold text-orange-800">{stats.pendingHK} quarto{stats.pendingHK > 1 ? 's' : ''} aguardando limpeza</span></div>
          )}
        </div>
      )}
    </div>
  );
}
