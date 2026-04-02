import { useEffect, useState } from 'react';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Building2, Users, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ tenants: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tenants').then(res => {
      const tenants = res.data.data || [];
      const totalUsers = tenants.reduce((s, t) => s + (t._count?.users || 0), 0);
      setStats({ tenants: tenants.length, users: totalUsers });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Painel Admin" description="Visão geral do sistema" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Empresas" value={stats.tenants} icon={Building2} />
        <StatCard title="Usuários" value={stats.users} icon={Users} />
      </div>
    </div>
  );
}
