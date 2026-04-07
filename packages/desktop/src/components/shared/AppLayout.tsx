import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Scissors,
  Users, BarChart3, Settings, LogOut, Bell, Wifi, WifiOff,
  ChevronLeft, ChevronRight, UserCircle, Receipt
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['all'] },
  { to: '/pos', icon: ShoppingCart, label: 'POS / Sales', roles: ['all'] },
  { to: '/sales', icon: Receipt, label: 'Sales History', roles: ['all'] },
  { to: '/inventory', icon: Package, label: 'Inventory', roles: ['ADMIN', 'MANAGER', 'STOREKEEPER'] },
  { to: '/embroidery', icon: Scissors, label: 'Embroidery', roles: ['all'] },
  { to: '/customers', icon: Users, label: 'Customers', roles: ['all'] },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', icon: UserCircle, label: 'Staff', roles: ['ADMIN'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['ADMIN'] },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Monitor connectivity
  React.useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success('Back online'); };
    const handleOffline = () => { setIsOnline(false); toast.error('Working offline'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Low stock alert count
  const { data: alertsData } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () => apiGet<any[]>('/inventory/alerts'),
    refetchInterval: 60_000,
  });
  const alertCount = (alertsData as any)?.data?.length || 0;

  const handleLogout = async () => {
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const visibleNav = navItems.filter(
    (item) =>
      item.roles.includes('all') ||
      (user?.role && item.roles.includes(user.role))
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-slate-900/95 border-r border-slate-800/70 shadow-xl shadow-slate-950/40 transition-all duration-200 backdrop-blur-xl ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Scissors size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-white font-semibold text-sm leading-none">UniForm POS</p>
              <p className="text-slate-400 text-xs mt-0.5">v1.0.0</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${isActive ? 'nav-card nav-card-active' : 'nav-card text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="truncate">
                  {item.label}
                  {item.to === '/inventory' && alertCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                      {alertCount}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Status bar */}
        <div className="px-3 py-3 border-t border-slate-800 space-y-2">
          {/* Connectivity */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi size={14} className="text-green-400 flex-shrink-0" />
            ) : (
              <WifiOff size={14} className="text-yellow-400 flex-shrink-0" />
            )}
            {!collapsed && (
              <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-yellow-400'}`}>
                {isOnline ? 'Online' : 'Offline mode'}
              </span>
            )}
          </div>

          {/* User info */}
          {!collapsed && user && (
            <div className="bg-slate-800 rounded-lg p-2">
              <p className="text-white text-xs font-medium truncate">{user.name}</p>
              <p className="text-slate-400 text-xs capitalize">
                {user.role.toLowerCase().replace('_', ' ')}
              </p>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors text-sm"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-32 -right-3 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto app-main p-6">
        <div className="min-h-full rounded-[2rem] border border-slate-800/60 bg-slate-950/80 shadow-2xl shadow-slate-950/40 p-6 backdrop-blur-xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
