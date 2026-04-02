import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Building2, LogOut, Menu } from 'lucide-react';

const adminNav = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/tenants', label: 'Empresas', icon: Building2 },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  if (user?.role !== 'super_admin') {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="px-5 py-5 border-b border-sidebar-border">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Bylance</h1>
          <p className="text-2xs text-sidebar-foreground/40 mt-0.5">Painel do Super Admin</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {adminNav.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                  isActive ? 'bg-white/10 text-white font-medium shadow-sm' : 'text-sidebar-foreground/50 hover:bg-white/5 hover:text-sidebar-foreground/90'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">A</div>
            <div className="flex-1"><p className="text-[13px] font-medium">{user?.name}</p><p className="text-2xs text-sidebar-foreground/40">Super Admin</p></div>
            <button onClick={logout} className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-red-400 hover:bg-white/5 transition-all"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card shadow-soft">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-muted transition-colors"><Menu className="w-5 h-5" /></button>
          <h1 className="font-semibold text-sm">Bylance Admin</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
