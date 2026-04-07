// UsersPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Shield } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export function UsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ['users'], queryFn: () => apiGet<any>('/users') });
  const users = (data as any)?.data || [];

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'text-red-400 bg-red-900/30',
    MANAGER: 'text-blue-400 bg-blue-900/30',
    CASHIER: 'text-green-400 bg-green-900/30',
    STOREKEEPER: 'text-yellow-400 bg-yellow-900/30',
    EMBROIDERY_OPERATOR: 'text-purple-400 bg-purple-900/30',
  };

  const createMutation = useMutation({
    mutationFn: (dto: any) => apiPost('/users', dto),
    onSuccess: () => { toast.success('Staff account created'); setShowCreate(false); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Staff Management</h1>
          <p className="text-slate-400 text-sm">Manage user accounts and roles</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map((user: any) => (
          <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">
                {user.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">{user.name}</p>
                <p className="text-slate-400 text-xs">{user.email}</p>
              </div>
              {!user.isActive && (
                <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[user.role] || 'text-slate-400 bg-slate-700/30'}`}>
                {user.role?.replace(/_/g, ' ')}
              </span>
              <p className="text-slate-500 text-xs">
                {user.lastLoginAt ? `Last login: ${formatDate(user.lastLoginAt)}` : 'Never logged in'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSubmit={(dto) => createMutation.mutate(dto)}
          loading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSubmit, loading }: any) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'CASHIER', pin: '' });
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-bold">New Staff Account</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { key: 'name', label: 'Full Name *', type: 'text', placeholder: 'Jane Kamau' },
            { key: 'email', label: 'Email *', type: 'email', placeholder: 'jane@shop.com' },
            { key: 'phone', label: 'Phone', type: 'tel', placeholder: '07XX XXX XXX' },
            { key: 'password', label: 'Password * (min 8 chars)', type: 'password', placeholder: '••••••••' },
            { key: 'pin', label: 'PIN (4 digits, for quick login)', type: 'text', placeholder: '1234' },
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
            <label className="text-slate-400 text-xs mb-1 block">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {['ADMIN', 'MANAGER', 'CASHIER', 'STOREKEEPER', 'EMBROIDERY_OPERATOR'].map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-3 text-sm font-medium transition-colors">Cancel</button>
          <button
            disabled={loading || !form.name || !form.email || !form.password}
            onClick={() => onSubmit({ ...form, pin: form.pin || undefined })}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white rounded-xl py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
