import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Scissors, Plus, Search, Filter, Clock, AlertTriangle,
  ChevronRight, User, Calendar, Banknote, Loader2
} from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { formatKES, formatDate, StatusBadge } from '../lib/utils';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'];

export function EmbroideryPage() {
  const [status, setStatus] = useState('ALL');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ['embroidery-jobs', status, query],
    queryFn: () =>
      apiGet<any>('/embroidery', {
        status: status === 'ALL' ? undefined : status,
        limit: 30,
      }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['embroidery-stats'],
    queryFn: () => apiGet<any>('/embroidery/stats'),
  });

  const jobs = (data as any)?.data?.data || [];
  const stats = (statsData as any)?.data;

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Embroidery Jobs</h1>
          <p className="text-slate-400 text-sm">Track and manage logo embroidery orders</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus size={18} />
          New Job Order
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Pending', value: stats.pending, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400', bg: 'bg-blue-900/30' },
            { label: 'Completed', value: stats.completed, color: 'text-green-400', bg: 'bg-green-900/30' },
            { label: 'Delivered', value: stats.delivered, color: 'text-purple-400', bg: 'bg-purple-900/30' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-400', bg: 'bg-red-900/30' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-slate-800 rounded-xl p-3 text-center`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 flex-1 max-w-sm">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search job number, customer…"
            className="bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none flex-1"
          />
        </div>

        <div className="flex gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                status === s
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs list */}
      {isPending ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <Scissors size={48} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400">No embroidery jobs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => {
            const isOverdue =
              new Date(job.dueDate) < new Date() &&
              !['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(job.status);

            return (
              <div
                key={job.id}
                onClick={() => navigate(`/embroidery/${job.id}`)}
                className="bg-slate-900 border border-slate-800 hover:border-purple-600/50 rounded-2xl p-4 cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                    job.status === 'IN_PROGRESS' ? 'bg-blue-400 animate-pulse' :
                    job.status === 'COMPLETED' ? 'bg-green-400' :
                    job.status === 'DELIVERED' ? 'bg-purple-400' :
                    isOverdue ? 'bg-red-400 animate-pulse' : 'bg-yellow-400'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-semibold text-sm">{job.jobNumber}</span>
                      <StatusBadge status={job.status} />
                      {job.priority === 'URGENT' && <StatusBadge status="URGENT" />}
                      {isOverdue && (
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <AlertTriangle size={12} />
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">Customer</p>
                        <p className="text-white truncate">{job.customerName}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Design</p>
                        <p className="text-slate-300 truncate">{job.designName}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Items / Due</p>
                        <p className="text-slate-300">
                          {job.totalItems} pcs · {formatDate(job.dueDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Cost / Paid</p>
                        <p className="text-green-400 font-medium">
                          {formatKES(job.totalCost)}
                          {Number(job.balanceDue) > 0 && (
                            <span className="text-red-400 text-xs ml-1">(-{formatKES(job.balanceDue)})</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {job.operator && (
                      <div className="flex items-center gap-1 mt-2 text-slate-500 text-xs">
                        <User size={11} />
                        <span>Operator: {job.operator.name}</span>
                      </div>
                    )}
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-slate-600 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-2"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create job modal */}
      {showCreate && (
        <CreateJobModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['embroidery-jobs'] });
            queryClient.invalidateQueries({ queryKey: ['embroidery-stats'] });
          }}
        />
      )}
    </div>
  );
}

function CreateJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    designName: '',
    threadColors: '',
    totalItems: 1,
    pricePerItem: 150,
    depositPaid: 0,
    priority: 'NORMAL',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    garmentType: 'Shirt',
    logoPosition: 'Left Chest',
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: () => apiGet<any>('/products/schools'),
  });
  const schools = (schoolsData as any)?.data || [];

  const mutation = useMutation({
    mutationFn: (data: any) => apiPost('/embroidery', data),
    onSuccess: () => {
      toast.success('Embroidery job created!');
      onCreated();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const total = form.totalItems * form.pricePerItem;
  const balance = total - form.depositPaid;

  const handleSubmit = () => {
    if (!form.customerName || !form.designName) {
      toast.error('Customer name and design name are required');
      return;
    }
    mutation.mutate({
      ...form,
      items: [{
        garmentType: form.garmentType,
        quantity: form.totalItems,
        logoPosition: form.logoPosition,
      }],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg">New Embroidery Job</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Customer Name *</label>
              <input
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="Full name or school"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Phone</label>
              <input
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="07XX XXX XXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Design Name *</label>
              <input
                value={form.designName}
                onChange={(e) => setForm({ ...form, designName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="e.g. Nairobi Academy Crest"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Thread Colors</label>
              <input
                value={form.threadColors}
                onChange={(e) => setForm({ ...form, threadColors: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="Navy, Gold, White"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Garment Type</label>
              <select
                value={form.garmentType}
                onChange={(e) => setForm({ ...form, garmentType: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {['Shirt', 'Blazer', 'Sweater', 'T-Shirt', 'Hoodie', 'Jacket', 'Cap', 'Bag'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Logo Position</label>
              <select
                value={form.logoPosition}
                onChange={(e) => setForm({ ...form, logoPosition: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {['Left Chest', 'Right Chest', 'Back', 'Both Sleeves', 'Front Center', 'Both'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Qty (items)</label>
              <input
                type="number"
                min={1}
                value={form.totalItems}
                onChange={(e) => setForm({ ...form, totalItems: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Price / item (KES)</label>
              <input
                type="number"
                value={form.pricePerItem}
                onChange={(e) => setForm({ ...form, pricePerItem: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Deposit Paid (KES)</label>
              <input
                type="number"
                value={form.depositPaid}
                onChange={(e) => setForm({ ...form, depositPaid: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">🔴 URGENT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
              placeholder="Special instructions…"
            />
          </div>

          {/* Cost summary */}
          <div className="bg-slate-800 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{form.totalItems} × {formatKES(form.pricePerItem)}</span>
              <span className="text-white font-semibold">{formatKES(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Deposit paid</span>
              <span className="text-green-400">-{formatKES(form.depositPaid)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-700 pt-1.5">
              <span className="text-white font-medium">Balance due</span>
              <span className="text-red-400 font-bold">{formatKES(balance)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white rounded-xl py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Create Job
          </button>
        </div>
      </div>
    </div>
  );
}
