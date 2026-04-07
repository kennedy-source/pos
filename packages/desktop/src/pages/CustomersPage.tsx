import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Users, Phone, School, Loader2 } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { formatKES, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export function CustomersPage() {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ['customers', query],
    queryFn: () => apiGet<any>('/customers', { q: query || undefined, limit: 40 }),
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: () => apiGet<any>('/products/schools'),
  });

  const customers = (data as any)?.data?.data || [];
  const schools = (schoolsData as any)?.data || [];

  const createMutation = useMutation({
    mutationFn: (dto: any) => apiPost('/customers', dto),
    onSuccess: () => {
      toast.success('Customer created');
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Customers</h1>
          <p className="text-slate-400 text-sm">Manage customer profiles and purchase history</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 max-w-md">
        <Search size={16} className="text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or phone…"
          className="bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none flex-1"
        />
      </div>

      {isPending ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((c: any) => (
            <div key={c.id} className="bg-slate-900 border border-slate-800 hover:border-blue-600/40 rounded-2xl p-4 transition-all cursor-pointer">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-900/50 rounded-full flex items-center justify-center text-blue-300 font-bold text-sm flex-shrink-0">
                  {c.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{c.name}</p>
                  {c.phone && <p className="text-slate-400 text-xs flex items-center gap-1"><Phone size={10} />{c.phone}</p>}
                  {c.school && <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5"><School size={10} />{c.school.name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                <div>
                  <p className="text-slate-500 text-xs">Total Spent</p>
                  <p className="text-green-400 text-sm font-semibold">{formatKES(c.totalPurchases)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Visits</p>
                  <p className="text-white text-sm font-semibold">{c.visitCount}</p>
                </div>
              </div>
              {Number(c.creditBalance) !== 0 && (
                <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  Number(c.creditBalance) < 0
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-green-900/30 text-green-400'
                }`}>
                  {Number(c.creditBalance) < 0 ? 'Owes' : 'Credit'}: {formatKES(Math.abs(c.creditBalance))}
                </div>
              )}
            </div>
          ))}
          {customers.length === 0 && (
            <div className="col-span-3 text-center py-16">
              <Users size={48} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-400">No customers found</p>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateCustomerModal
          schools={schools}
          onClose={() => setShowCreate(false)}
          onSubmit={(dto) => createMutation.mutate(dto)}
          loading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateCustomerModal({ schools, onClose, onSubmit, loading }: any) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', schoolId: '', notes: '' });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-bold">New Customer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { key: 'name', label: 'Full Name *', placeholder: 'Jane Wanjiku', type: 'text' },
            { key: 'phone', label: 'Phone Number', placeholder: '07XX XXX XXX', type: 'tel' },
            { key: 'email', label: 'Email', placeholder: 'jane@email.com', type: 'email' },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-slate-400 text-xs mb-1 block">{f.label}</label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
          <div>
            <label className="text-slate-400 text-xs mb-1 block">School (optional)</label>
            <select
              value={form.schoolId}
              onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">No school</option>
              {schools.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-3 text-sm font-medium transition-colors">Cancel</button>
          <button
            disabled={loading || !form.name}
            onClick={() => onSubmit({ ...form, schoolId: form.schoolId || undefined })}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white rounded-xl py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Create Customer
          </button>
        </div>
      </div>
    </div>
  );
}
