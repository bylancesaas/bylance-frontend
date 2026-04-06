import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Wrench, FileText, Shield,
  DollarSign, Package, Menu, X, LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant, useHasModule } from '@/contexts/TenantContext';

const allNavItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard, module: 'dashboard', roles: ['director', 'assistant', 'mechanic'] },
  { path: '/clients', label: 'Clientes', icon: Users, module: 'clients', roles: ['director', 'assistant', 'mechanic'] },
  { path: '/items', label: 'Estoque', icon: Package, module: 'items', roles: ['director', 'assistant', 'mechanic'] },
  { path: '/service-orders', label: 'Ordens de Serviço', icon: FileText, module: 'serviceOrders', roles: ['director', 'assistant', 'mechanic'] },
  { path: '/warranties', label: 'Garantias', icon: Shield, module: 'warranties', roles: ['director', 'assistant', 'mechanic'] },
  { path: '/financial', label: 'Financeiro', icon: DollarSign, module: 'financial', roles: ['director', 'assistant'] },
  { path: '/user-management', label: 'Usuários', icon: Users, module: 'userManagement', roles: ['director'] },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { tenant, modules } = useTenant();

  const roleLabels = { director: 'Diretor', assistant: 'Assistente', mechanic: 'Técnico' };

  const navItems = allNavItems.filter(item =>
    modules.includes(item.module) && item.roles.includes(user?.role)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        {/* Logo / Tenant Name */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          {tenant?.logo ? (
            <img src={tenant.logo} alt={tenant.name} className="h-9 w-9 rounded-lg object-contain p-0.5" style={{ backgroundColor: tenant.iconBgColor || '#ffffff' }} />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-sidebar-foreground/15 flex items-center justify-center text-sidebar-foreground font-bold text-sm">
              {tenant?.name?.[0] || 'B'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-black text-base tracking-tight truncate text-sidebar-foreground">{tenant?.name || 'Bylance'}</h1>
            <p className="text-2xs text-sidebar-foreground/40">{tenant?.businessType || 'Sistema'}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                  isActive
                    ? 'bg-sidebar-foreground/[0.18] text-sidebar-foreground font-semibold'
                    : 'text-sidebar-foreground/55 hover:bg-sidebar-foreground/[0.07] hover:text-sidebar-foreground/90'
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-sidebar-foreground' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-foreground/10 flex items-center justify-center text-xs font-semibold">
              {user?.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{user?.name}</p>
              <p className="text-2xs text-sidebar-foreground/40">{roleLabels[user?.role] || user?.role}</p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-red-400 hover:bg-sidebar-foreground/5 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card shadow-soft">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-muted transition-colors"><Menu className="w-5 h-5" /></button>
          <h1 className="font-semibold text-sm">{tenant?.name || 'Bylance'}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
