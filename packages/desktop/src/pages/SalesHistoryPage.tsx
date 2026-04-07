// SalesHistoryPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Receipt, Printer, RefreshCw } from 'lucide-react';
import { apiGet } from '../lib/api';
import { formatKES, formatDate, StatusBadge } from '../lib/utils';
import { generateReceiptHTML } from '../lib/utils';

export function SalesHistoryPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('COMPLETED');
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data, isPending } = useQuery({
    queryKey: ['sales', status, fromDate, query],
    queryFn: () => apiGet<any>('/sales', { status, fromDate, limit: 40 }),
  });

  const sales = (data as any)?.data?.data || [];

  const printReceipt = async (sale: any) => {
    const res = await apiGet<any>(`/sales/${sale.id}`);
    const full = (res as any)?.data;
    const html = generateReceiptHTML(full);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.print(); }
  };

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-2xl font-bold">Sales History</h1>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 flex-1 min-w-48">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Receipt number, customer…"
            className="bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none flex-1"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="DRAFT">Draft</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="PARTIALLY_REFUNDED">Refunded</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-slate-400 font-medium px-4 py-3">Receipt</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">Customer</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">Cashier</th>
              <th className="text-center text-slate-400 font-medium px-4 py-3">Items</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">Payment</th>
              <th className="text-right text-slate-400 font-medium px-4 py-3">Total</th>
              <th className="text-center text-slate-400 font-medium px-4 py-3">Status</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">Date</th>
              <th className="text-center text-slate-400 font-medium px-4 py-3">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale: any) => (
              <tr key={sale.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="px-4 py-3 font-mono text-blue-400 text-xs">{sale.receiptNumber}</td>
                <td className="px-4 py-3 text-white">{sale.customer?.name || 'Walk-in'}</td>
                <td className="px-4 py-3 text-slate-400">{sale.cashier?.name}</td>
                <td className="px-4 py-3 text-center text-slate-300">{sale._count?.items || 0}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                    {sale.paymentMethod?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatKES(sale.totalAmount)}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={sale.status} /></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(sale.createdAt, 'short')}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => printReceipt(sale)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Printer size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <p className="text-center text-slate-500 py-10 text-sm">No sales found</p>
        )}
      </div>
    </div>
  );
}
