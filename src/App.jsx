import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { Toaster } from 'sonner';

import Login from '@/pages/Login';
import AdminLayout from '@/components/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import TenantList from '@/pages/admin/TenantList';
import TenantForm from '@/pages/admin/TenantForm';
import AppLayout from '@/components/Layout';
import Dashboard from '@/pages/app/Dashboard';
import Clients from '@/pages/app/Clients';
import Items from '@/pages/app/Items';
import Services from '@/pages/app/Services';
import ServiceOrders from '@/pages/app/ServiceOrders';
import Warranties from '@/pages/app/Warranties';
import Financial from '@/pages/app/Financial';
import UserManagement from '@/pages/app/UserManagement';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" /><p className="text-xs text-muted-foreground">Carregando...</p></div></div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" /><p className="text-xs text-muted-foreground">Carregando...</p></div></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Super Admin routes */}
      <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="tenants" element={<TenantList />} />
        <Route path="tenants/new" element={<TenantForm />} />
        <Route path="tenants/:id" element={<TenantForm />} />
      </Route>

      {/* Tenant App routes */}
      <Route path="/" element={<PrivateRoute><TenantProvider><AppLayout /></TenantProvider></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="items" element={<Items />} />
        <Route path="services" element={<Services />} />
        <Route path="service-orders" element={<ServiceOrders />} />
        <Route path="warranties" element={<Warranties />} />
        <Route path="financial" element={<Financial />} />
        <Route path="user-management" element={<UserManagement />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors toastOptions={{ className: 'shadow-elevated border', style: { borderRadius: '0.75rem' } }} />
    </QueryClientProvider>
  );
}
