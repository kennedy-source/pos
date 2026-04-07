import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/shared/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProductDetailPage, AddProductPage, EmbroideryJobPage, SettingsPage } from './pages';
import { EmbroideryPage } from './pages/EmbroideryPage';
import { CustomersPage } from './pages/CustomersPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const user = useAuthStore((s) => s.user);
  if (!user || (!roles.includes('all') && !roles.includes(user.role))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              fontSize: '14px',
              borderRadius: '8px',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="sales" element={<SalesHistoryPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/new" element={<AddProductPage />} />
            <Route path="inventory/:id" element={<ProductDetailPage />} />
            <Route path="embroidery" element={<EmbroideryPage />} />
            <Route path="embroidery/:id" element={<EmbroideryJobPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route
              path="reports"
              element={
                <RequireRole roles={['ADMIN', 'MANAGER']}>
                  <ReportsPage />
                </RequireRole>
              }
            />
            <Route
              path="users"
              element={
                <RequireRole roles={['ADMIN']}>
                  <UsersPage />
                </RequireRole>
              }
            />
            <Route
              path="settings"
              element={
                <RequireRole roles={['ADMIN']}>
                  <SettingsPage />
                </RequireRole>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
