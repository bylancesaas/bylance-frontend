import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  LayoutDashboard, Users, FileText, Shield,
  DollarSign, Package, Menu, LogOut,
  User, Layers, DoorOpen, CalendarDays, Sparkles, BedDouble,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

const allNavItems = [
  // Mechanic vertical
  { path: '/', label: 'Home', icon: LayoutDashboard, module: 'dashboard', verticals: ['mecanica'], roles: ['director', 'assistant', 'mechanic'] },
  { path: '/clients', label: 'Clientes', icon: Users, module: 'clients', verticals: ['mecanica'], roles: ['director', 'assistant', 'mechanic'] },
  { path: '/items', label: 'Estoque', icon: Package, module: 'items', verticals: ['mecanica'], roles: ['director', 'assistant', 'mechanic'] },
  { path: '/service-orders', label: 'Ordens de Serviço', icon: FileText, module: 'serviceOrders', verticals: ['mecanica'], roles: ['director', 'assistant', 'mechanic'] },
  { path: '/warranties', label: 'Garantias', icon: Shield, module: 'warranties', verticals: ['mecanica'], roles: ['director', 'assistant', 'mechanic'] },
  { path: '/financial', label: 'Financeiro', icon: DollarSign, module: 'financial', verticals: ['mecanica', 'hotel'], roles: ['director', 'assistant'] },
  { path: '/user-management', label: 'Usuários', icon: Users, module: 'userManagement', verticals: ['mecanica', 'hotel'], roles: ['director'] },
  // Hotel vertical
  { path: '/hotel', label: 'Dashboard', icon: BedDouble, module: 'dashboard', verticals: ['hotel'], roles: ['director', 'assistant', 'mechanic'] },
  { path: '/guests', label: 'Hóspedes', icon: User, module: 'guests', verticals: ['hotel'], roles: ['director', 'assistant', 'mechanic'] },
  { path: '/room-types', label: 'Tipos de Quarto', icon: Layers, module: 'roomTypes', verticals: ['hotel'], roles: ['director', 'assistant'] },
  { path: '/rooms', label: 'Quartos', icon: DoorOpen, module: 'rooms', verticals: ['hotel'], roles: ['director', 'assistant', 'mechanic'] },
  { path: '/reservations', label: 'Reservas', icon: CalendarDays, module: 'reservations', verticals: ['hotel'], roles: ['director', 'assistant', 'mechanic'] },
  { path: '/housekeeping', label: 'Governança', icon: Sparkles, module: 'housekeeping', verticals: ['hotel'], roles: ['director', 'assistant', 'mechanic'] },
];

// Wraps children in a tooltip when show=true (used for collapsed sidebar icons)
function SideTooltip({ children, label, show }) {
  if (!show) return <>{children}</>;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="right"
          sideOffset={10}
          className="z-[100] rounded-md bg-popover text-popover-foreground shadow-overlay border border-border px-2.5 py-1 text-xs font-medium select-none"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { tenant, modules, vertical } = useTenant();

  const roleLabels = { director: 'Diretor', assistant: 'Assistente', mechanic: 'Técnico' };

  const navItems = allNavItems.filter(item =>
    item.verticals.includes(vertical) &&
    modules.includes(item.module) &&
    item.roles.includes(user?.role)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <TooltipPrimitive.Provider delayDuration={150}>
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50 flex flex-col
            bg-sidebar text-sidebar-foreground
            transition-all duration-300 ease-in-out overflow-hidden
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
            ${collapsed ? 'w-64 lg:w-[4.5rem]' : 'w-64'}
          `}
        >
          {/* ── Logo / Tenant ── */}
          <div className="flex items-center gap-3 px-5 py-[1.125rem] border-b border-sidebar-border">
            <div className="flex-shrink-0">
              {tenant?.logo ? (
                <img
                  src={tenant.logo}
                  alt={tenant.name}
                  className="h-9 w-9 rounded-lg object-contain p-0.5"
                  style={{ backgroundColor: tenant.iconBgColor || '#ffffff' }}
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-sidebar-foreground/15 flex items-center justify-center text-sidebar-foreground font-bold text-sm">
                  {tenant?.name?.[0] || 'B'}
                </div>
              )}
            </div>
            <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <h1 className="font-black text-base tracking-tight truncate text-sidebar-foreground">
                {tenant?.name || 'Bylance'}
              </h1>
              <p className="text-2xs text-sidebar-foreground/40">{tenant?.businessType || 'Sistema'}</p>
            </div>
            {/* Collapse button — only on desktop when expanded */}
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex p-1.5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 transition-all flex-shrink-0"
                title="Recolher menu"
              >
                <PanelLeftClose className="w-[15px] h-[15px]" />
              </button>
            )}
            {/* Expand button inside header — only on desktop when collapsed */}
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="hidden lg:flex p-1.5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 transition-all flex-shrink-0"
                title="Expandir menu"
              >
                <PanelLeftOpen className="w-[15px] h-[15px]" />
              </button>
            )}
          </div>

          {/* ── Navigation ── */}
          <nav className={`flex-1 overflow-y-auto py-3 space-y-0.5 ${collapsed ? 'lg:px-2 px-3' : 'px-3'}`}>
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <SideTooltip key={item.path} label={item.label} show={collapsed}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 rounded-lg text-[13px] transition-all duration-150
                      ${collapsed ? 'lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2' : 'px-3 py-2'}
                      ${isActive
                        ? 'bg-sidebar-foreground/[0.18] text-sidebar-foreground font-semibold'
                        : 'text-sidebar-foreground/55 hover:bg-sidebar-foreground/[0.07] hover:text-sidebar-foreground/90'
                      }
                    `}
                  >
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                    <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </Link>
                </SideTooltip>
              );
            })}
          </nav>

          {/* ── User footer ── */}
          <div className={`border-t border-sidebar-border ${collapsed ? 'lg:py-3 lg:px-2 p-4' : 'p-4'}`}>
            {/* Collapsed desktop: stacked icon + logout */}
            {collapsed && (
              <div className="hidden lg:flex flex-col items-center gap-1.5">
                <SideTooltip label={`${user?.name} · ${roleLabels[user?.role] || user?.role}`} show>
                  <div className="w-9 h-9 rounded-full bg-sidebar-foreground/10 flex items-center justify-center text-xs font-semibold cursor-default select-none">
                    {user?.name?.[0]}
                  </div>
                </SideTooltip>
                <SideTooltip label="Sair" show>
                  <button
                    onClick={logout}
                    className="p-2 rounded-md text-sidebar-foreground/40 hover:text-red-400 hover:bg-sidebar-foreground/10 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </SideTooltip>
              </div>
            )}
            {/* Full row: always on mobile; on desktop only when expanded */}
            <div className={`flex items-center gap-3 ${collapsed ? 'lg:hidden' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-sidebar-foreground/10 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {user?.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{user?.name}</p>
                <p className="text-2xs text-sidebar-foreground/40">{roleLabels[user?.role] || user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-red-400 hover:bg-sidebar-foreground/5 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </TooltipPrimitive.Provider>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card shadow-soft">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-sm">{tenant?.name || 'Bylance'}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
