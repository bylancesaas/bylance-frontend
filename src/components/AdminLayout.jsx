import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Building2, LogOut, Menu, ChevronLeft, ChevronRight } from 'lucide-react';

const adminNav = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/tenants', label: 'Empresas', icon: Building2 },
];

function NavTooltip({ label, children }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-popover text-popover-foreground border shadow-md opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-border" />
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  if (user?.role !== 'super_admin') {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-sidebar text-sidebar-foreground flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-sidebar-border h-[110px] shrink-0 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <img src="/assets/Horizontal.png" alt="Bylance" className="h-16 w-auto brightness-0 invert mt-5" />
              <p className="text-2xs text-sidebar-foreground/40 mt-2">Painel do Super Admin</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-sidebar-foreground/20 bg-sidebar-foreground/10 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-foreground/20 transition-all shrink-0 shadow-sm"
            aria-label={collapsed ? 'Expandir sidebar' : 'Retrair sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {adminNav.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            const link = (
              <Link
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-2 py-2 rounded-lg text-[13px] transition-all duration-150
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-primary/[0.18] text-white font-semibold'
                    : 'text-sidebar-foreground/55 hover:bg-white/[0.07] hover:text-sidebar-foreground/90'}`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
            return collapsed ? (
              <NavTooltip key={item.path} label={item.label}>{link}</NavTooltip>
            ) : (
              <div key={item.path}>{link}</div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-sidebar-border shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}>
          {collapsed ? (
            <NavTooltip label="Sair">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground/40 hover:text-red-400 hover:bg-white/5 transition-all"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </NavTooltip>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{user?.name}</p>
                <p className="text-2xs text-sidebar-foreground/40">Super Admin</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-red-400 hover:bg-white/5 transition-all"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card shadow-soft">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <img src="/assets/Horizontal.png" alt="Bylance" className="h-6 w-auto" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
