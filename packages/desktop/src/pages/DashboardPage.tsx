import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, Package, Scissors, AlertTriangle,
  ShoppingCart, ArrowUpRight, Clock, CheckCircle2,
  Users, DollarSign
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { apiGet } from '../lib/api';
import { formatKES, formatDate, StatusBadge } from '../lib/utils';

function StatCard({
  label, value, sub, icon: Icon, color, trend
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-lg">
        <div className={`stat-card-icon ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend && (
          <div className="stat-card-trend">
            <ArrowUpRight size={14} />
            {trend}
          </div>
        )}
      </div>
      <p className="stat-card-value">{value}</p>
      <p className="stat-card-label">{label}</p>
      {sub && <p className="stat-card-subtitle">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { data: dashData, isPending } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<any>('/reports/dashboard'),
    refetchInterval: 30_000,
  });

  const { data: salesReport } = useQuery({
    queryKey: ['sales-report-week'],
    queryFn: () => {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return apiGet<any>('/reports/sales', {
        fromDate: from.toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
      });
    },
  });

  const dash = (dashData as any)?.data;
  const salesByDay = (salesReport as any)?.data?.byDay || [];
  const recentSales = dash?.recentSales || [];

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-tertiary">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="p-2xl space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col gap-lg md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-primary text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-tertiary text-sm mt-sm">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-sm bg-glass border border-light rounded-2xl px-lg py-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-emerald animate-pulse" />
          <span className="text-accent-emerald text-sm font-medium">Live</span>
        </div>
      </div>

      {/* Alerts banner */}
      {(dash?.alerts?.lowStock > 0 || dash?.embroidery?.overdue > 0) && (
        <div className="alert alert-danger">
          <AlertTriangle className="alert-icon" size={20} />
          <div className="alert-content">
            <div className="space-y-sm">
              {dash.alerts.lowStock > 0 && (
                <p><strong>{dash.alerts.lowStock}</strong> low stock alert{dash.alerts.lowStock > 1 ? 's' : ''}</p>
              )}
              {dash.embroidery?.overdue > 0 && (
                <p><strong>{dash.embroidery.overdue}</strong> overdue embroidery job{dash.embroidery.overdue > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-md">
        <StatCard
          label="Today's Revenue"
          value={formatKES(dash?.today?.revenue || 0)}
          sub={`${dash?.today?.salesCount || 0} sales`}
          icon={DollarSign}
          color="stat-card--emerald"
          trend={dash?.today?.grossProfit ? `${dash.today.profitMargin}% margin` : undefined}
        />
        <StatCard
          label="This Week"
          value={formatKES(dash?.week?.revenue || 0)}
          sub={`${dash?.week?.salesCount || 0} sales`}
          icon={TrendingUp}
          color="stat-card--blue"
        />
        <StatCard
          label="Embroidery Jobs"
          value={String(dash?.embroidery?.pending || 0)}
          sub="Active jobs"
          icon={Scissors}
          color="stat-card--purple"
        />
        <StatCard
          label="Low Stock Items"
          value={String(dash?.alerts?.lowStock || 0)}
          sub="Need restocking"
          icon={AlertTriangle}
          color={dash?.alerts?.lowStock > 0 ? 'stat-card--rose' : 'stat-card--neutral'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-md">
        {/* Revenue chart */}
        <div className="chart-container">
          <h3 className="chart-title">Revenue — Last 7 Days</h3>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ 
                    background: 'var(--color-bg-glass)', 
                    border: '1px solid var(--color-border-light)', 
                    borderRadius: 'var(--radius-lg)' 
                  }}
                  labelStyle={{ color: 'var(--color-text-secondary)' }}
                  formatter={(v: any) => [formatKES(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Embroidery status */}
        <div className="glass-card p-2xl">
          <h3 className="text-primary font-semibold mb-lg">Embroidery Status</h3>
          <div className="space-y-md">
            {[
              { status: 'Pending', count: dash?.embroidery?.byStatus?.find((s: any) => s.status === 'PENDING')?._count || 0, color: 'bg-amber-400' },
              { status: 'In Progress', count: dash?.embroidery?.byStatus?.find((s: any) => s.status === 'IN_PROGRESS')?._count || 0, color: 'bg-sky-400' },
              { status: 'Completed', count: dash?.embroidery?.byStatus?.find((s: any) => s.status === 'COMPLETED')?._count || 0, color: 'bg-emerald-400' },
              { status: 'Delivered', count: dash?.embroidery?.byStatus?.find((s: any) => s.status === 'DELIVERED')?._count || 0, color: 'bg-purple-400' },
            ].map((item) => (
              <div key={item.status} className="flex items-center gap-md">
                <div className="w-sm h-sm rounded-full flex-shrink-0">
                  <div className={`w-full h-full rounded-full ${item.color}`} />
                </div>
                <span className="text-tertiary text-sm flex-1">{item.status}</span>
                <span className="text-primary font-semibold">{item.count}</span>
                <div className="w-24 bg-glass rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${Math.min(100, (item.count / Math.max(1, 10)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="glass-card p-2xl">
        <div className="flex items-center justify-between mb-lg">
          <h3 className="text-primary font-semibold">Recent Sales</h3>
          <a href="/sales" className="text-accent-blue text-sm hover:text-accent-blue transition-fast">View all →</a>
        </div>
        <div className="space-y-sm">
          {recentSales.length === 0 ? (
            <p className="text-muted text-sm text-center py-lg">No sales yet today</p>
          ) : (
            recentSales.map((sale: any) => (
              <div key={sale.id} className="flex items-center gap-lg p-md bg-glass rounded-xl">
                <div className="w-8 h-8 bg-accent-emerald/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-accent-emerald" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-primary text-sm font-medium">{sale.customer?.name || 'Walk-in'}</p>
                  <p className="text-tertiary text-xs">{sale._count?.items || 0} items · {sale.cashier?.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-accent-emerald text-sm font-semibold">{formatKES(sale.totalAmount)}</p>
                  <p className="text-muted text-xs">{formatDate(sale.completedAt || sale.createdAt, 'time')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
