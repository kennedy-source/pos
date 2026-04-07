import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { apiGet } from '../lib/api';
import { formatKES, formatDate } from '../lib/utils';
import { TrendingUp, Package, Scissors, Users, Download } from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'embroidery'>('sales');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: salesData, isPending: salesLoading } = useQuery({
    queryKey: ['report-sales', fromDate, toDate],
    queryFn: () => apiGet<any>('/reports/sales', { fromDate, toDate }),
    enabled: activeTab === 'sales',
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => apiGet<any>('/reports/inventory'),
    enabled: activeTab === 'inventory',
  });

  const { data: embroideryData } = useQuery({
    queryKey: ['report-embroidery', fromDate, toDate],
    queryFn: () => apiGet<any>('/reports/embroidery', { fromDate, toDate }),
    enabled: activeTab === 'embroidery',
  });

  const { data: topCustomersData } = useQuery({
    queryKey: ['top-customers'],
    queryFn: () => apiGet<any>('/reports/customers/top?limit=8'),
  });

  const sales = (salesData as any)?.data;
  const inventory = (inventoryData as any)?.data;
  const embroidery = (embroideryData as any)?.data;
  const topCustomers = (topCustomersData as any)?.data || [];

  const paymentMethodData = sales?.byPaymentMethod
    ? Object.entries(sales.byPaymentMethod).map(([name, value]) => ({ name: name.replace('_', ' '), value }))
    : [];

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm">Business performance insights</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {[
          { key: 'sales', label: 'Sales', icon: TrendingUp },
          { key: 'inventory', label: 'Inventory', icon: Package },
          { key: 'embroidery', label: 'Embroidery', icon: Scissors },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── SALES TAB ─── */}
      {activeTab === 'sales' && sales && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: formatKES(sales.summary.totalRevenue), sub: `${sales.summary.totalSales} sales`, color: 'text-green-400' },
              { label: 'Gross Profit', value: formatKES(sales.summary.grossProfit), sub: `Margin: ${sales.summary.totalRevenue > 0 ? Math.round((sales.summary.grossProfit / sales.summary.totalRevenue) * 100) : 0}%`, color: 'text-blue-400' },
              { label: 'Total COGS', value: formatKES(sales.summary.totalCost), sub: 'Cost of goods sold', color: 'text-orange-400' },
              { label: 'Avg Order Value', value: formatKES(sales.summary.averageOrderValue), sub: 'Per transaction', color: 'text-purple-400' },
            ].map((card) => (
              <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-white text-sm font-medium mt-1">{card.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Revenue by day chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Daily Revenue vs Profit</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sales.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(v: any, name: string) => [formatKES(v), name === 'revenue' ? 'Revenue' : 'Profit']}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="revenue" />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment methods */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Payment Methods</h3>
              {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {paymentMethodData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatKES(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">No sales in selected period</p>
              )}
            </div>

            {/* Top products */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Top Products by Revenue</h3>
              <div className="space-y-2">
                {(sales.topProducts || []).slice(0, 6).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{p.name}</p>
                      <div className="mt-1 bg-slate-800 rounded-full h-1.5">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, (p.revenue / (sales.topProducts[0]?.revenue || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-green-400 text-xs font-medium">{formatKES(p.revenue)}</p>
                      <p className="text-slate-500 text-xs">{p.qty} units</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── INVENTORY TAB ─── */}
      {activeTab === 'inventory' && inventory && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Stock Units', value: inventory.summary.totalUnits?.toLocaleString(), color: 'text-blue-400' },
              { label: 'Stock Cost Value', value: formatKES(inventory.summary.totalCostValue), color: 'text-orange-400' },
              { label: 'Retail Value', value: formatKES(inventory.summary.totalRetailValue), color: 'text-green-400' },
              { label: 'Potential Profit', value: formatKES(inventory.summary.potentialProfit), color: 'text-purple-400' },
              { label: 'Low Stock Items', value: inventory.summary.lowStockCount, color: 'text-yellow-400' },
              { label: 'Out of Stock', value: inventory.summary.outOfStockCount, color: 'text-red-400' },
            ].map((card) => (
              <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-slate-400 text-sm mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Stock by category */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Stock Value by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={inventory.byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tickFormatter={(v) => formatKES(v)} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v: any) => formatKES(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Retail Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Low stock table */}
          {inventory.lowStock?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h3 className="text-white font-semibold">Low Stock Items ({inventory.lowStock.length})</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-slate-400 font-medium px-4 py-3">Product</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">Category</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3">Current Stock</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3">Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.lowStock.slice(0, 10).map((item: any) => (
                    <tr key={item.variantId} className="border-b border-slate-800/50">
                      <td className="px-4 py-3">
                        <p className="text-white">{item.productName}</p>
                        <p className="text-slate-500 text-xs">{[item.size, item.color].filter(Boolean).join(' / ')}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{item.category}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${item.currentStock === 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400">{item.reorderLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── EMBROIDERY TAB ─── */}
      {activeTab === 'embroidery' && embroidery && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Jobs', value: embroidery.summary.totalJobs, color: 'text-blue-400' },
              { label: 'Completed', value: embroidery.summary.completedJobs, color: 'text-green-400' },
              { label: 'Total Revenue', value: formatKES(embroidery.summary.totalRevenue), color: 'text-purple-400' },
              { label: 'Balance Owed', value: formatKES(embroidery.summary.balanceOwed), color: 'text-yellow-400' },
            ].map((card) => (
              <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-slate-400 text-sm mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By school */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Revenue by School</h3>
              <div className="space-y-3">
                {(embroidery.bySchool || []).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-white text-sm">{s.name}</p>
                      <p className="text-slate-500 text-xs">{s.jobs} jobs</p>
                    </div>
                    <span className="text-purple-400 font-semibold text-sm">{formatKES(s.revenue)}</span>
                  </div>
                ))}
                {(embroidery.bySchool || []).length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No data for period</p>
                )}
              </div>
            </div>

            {/* By operator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Jobs by Operator</h3>
              <div className="space-y-3">
                {(embroidery.byOperator || []).map((op: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {op.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">{op.name}</p>
                      <p className="text-slate-500 text-xs">{op.jobs} jobs</p>
                    </div>
                    <span className="text-green-400 font-semibold text-sm">{formatKES(op.revenue)}</span>
                  </div>
                ))}
                {(embroidery.byOperator || []).length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No assigned operators</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Customers section (always shown) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Top Customers</h3>
          <Users size={16} className="text-slate-500" />
        </div>
        <div className="space-y-2">
          {topCustomers.map((c: any, i: number) => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
              <span className="text-slate-500 text-sm w-5">{i + 1}</span>
              <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-300 text-xs font-bold flex-shrink-0">
                {c.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">{c.name}</p>
                <p className="text-slate-500 text-xs">{c.phone} · {c.school?.name || 'No school'}</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 text-sm font-semibold">{formatKES(c.totalPurchases)}</p>
                <p className="text-slate-500 text-xs">{c.visitCount} visits</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
