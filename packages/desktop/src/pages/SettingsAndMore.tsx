// SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Loader2, Scissors, Clock, User, CheckCircle, Package, Download, AlertCircle } from 'lucide-react';
import { apiGet, apiPatch } from '../lib/api';
import { formatKES, formatDate, StatusBadge } from '../lib/utils';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => apiGet<any>('/settings') });
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloaded'>('idle');
  const [newVersion, setNewVersion] = useState('');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getVersion().then((v) => setAppVersion(v));
      window.electronAPI.onUpdateAvailable(() => {
        setUpdateStatus('available');
        toast('Update available! Click "Install Now" to update.', { icon: '📦' });
      });
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateStatus('downloaded');
        toast('Update ready! Click "Restart & Install" to apply.');
      });
    }
  }, []);

  const handleCheckUpdates = async () => {
    if (!window.electronAPI) return;
    setUpdateStatus('checking');
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result.updateAvailable) {
        setUpdateStatus('available');
        setNewVersion(result.newVersion);
        toast.success(`Update available: v${result.newVersion}`);
      } else {
        setUpdateStatus('idle');
        toast.success('You are running the latest version');
      }
    } catch (error) {
      setUpdateStatus('idle');
      toast.error('Failed to check for updates');
    }
  };

  const handleInstallUpdate = () => {
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div>
        <h1 className="text-white text-2xl font-bold">System Settings</h1>
        <p className="text-slate-400 text-sm">Configure shop details, receipt, and system preferences</p>
      </div>

      {/* About & Updates Section */}
      {window.electronAPI && (
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Package size={18} />
                About UniForm POS
              </h2>
              <p className="text-slate-300 text-sm mb-2">Version: <span className="text-blue-400 font-mono">{appVersion}</span></p>
              <p className="text-slate-400 text-xs">Check for updates to get the latest features and improvements</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCheckUpdates}
                disabled={updateStatus === 'checking'}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 font-medium transition-colors text-sm"
              >
                {updateStatus === 'checking' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Check for Updates
                  </>
                )}
              </button>
              {(updateStatus === 'available' || updateStatus === 'downloaded') && (
                <button
                  onClick={handleInstallUpdate}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-lg px-4 py-2.5 font-medium transition-colors text-sm"
                >
                  <CheckCircle size={14} />
                  {updateStatus === 'downloaded' ? 'Restart & Install' : 'Install Now'}
                </button>
              )}
            </div>
          </div>
          {updateStatus === 'available' && newVersion && (
            <div className="mt-4 flex items-center gap-2 text-green-400 text-sm bg-green-900/20 border border-green-700/50 rounded-lg p-3">
              <AlertCircle size={14} />
              New version available: <span className="font-mono font-semibold">{newVersion}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Shop Information</h2>
          <div className="space-y-3">
            {[
              { label: 'Shop Name', key: 'shop_name', placeholder: 'UniForm Shop Kenya' },
              { label: 'Address', key: 'shop_address', placeholder: 'Westlands, Nairobi' },
              { label: 'Phone', key: 'shop_phone', placeholder: '0722 000 000' },
              { label: 'Email', key: 'shop_email', placeholder: 'info@shop.co.ke' },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-slate-400 text-xs mb-1 block">{f.label}</label>
                <input
                  placeholder={f.placeholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">M-Pesa Settings</h2>
          <div className="space-y-3">
            {[
              { label: 'Paybill / Till Number', key: 'mpesa_paybill', placeholder: '247247' },
              { label: 'Account Reference', key: 'mpesa_account', placeholder: 'UNIFORM' },
              { label: 'Consumer Key', key: 'mpesa_consumer_key', placeholder: '••••••••••', type: 'password' },
              { label: 'Consumer Secret', key: 'mpesa_consumer_secret', placeholder: '••••••••••', type: 'password' },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-slate-400 text-xs mb-1 block">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  placeholder={f.placeholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Receipt Settings</h2>
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Receipt Footer Message</label>
              <textarea
                rows={3}
                placeholder="Thank you for shopping with us!"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">VAT / Tax Rate (%)</label>
              <input
                type="number"
                defaultValue={0}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Stock Alerts</h2>
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Default Low Stock Threshold</label>
              <input
                type="number"
                defaultValue={5}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <button className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl px-6 py-3 font-medium transition-colors">
        <Save size={16} />
        Save Settings
      </button>
    </div>
  );
}


// EmbroideryJobPage.tsx
export function EmbroideryJobPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['embroidery-job', id],
    queryFn: () => apiGet<any>(`/embroidery/${id}`),
  });

  const { data: operatorsData } = useQuery({
    queryKey: ['operators'],
    queryFn: () => apiGet<any>('/users/operators'),
  });

  const job = (data as any)?.data;
  const operators = (operatorsData as any)?.data || [];

  const statusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      apiPatch(`/embroidery/${id}/status`, { status, notes }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['embroidery-job', id] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: (operatorId: string) => apiPatch(`/embroidery/${id}/assign`, { operatorId }),
    onSuccess: () => { toast.success('Operator assigned'); qc.invalidateQueries({ queryKey: ['embroidery-job', id] }); },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  if (!job) return <div className="p-6 text-slate-400">Job not found</div>;

  const STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'PENDING'],
    COMPLETED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  const nextStatuses = STATUS_TRANSITIONS[job.status] || [];

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-white text-2xl font-bold">{job.jobNumber}</h1>
            <StatusBadge status={job.status} />
            {job.priority === 'URGENT' && <StatusBadge status="URGENT" />}
          </div>
          <p className="text-slate-400">{job.designName} · {job.customerName}</p>
        </div>
        <div className="flex gap-2">
          {nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => statusMutation.mutate({ status: s })}
              disabled={statusMutation.isPending}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                s === 'CANCELLED' ? 'bg-red-900/30 border border-red-700/50 text-red-400 hover:bg-red-900/50' :
                s === 'COMPLETED' ? 'bg-green-600 hover:bg-green-500 text-white' :
                s === 'DELIVERED' ? 'bg-purple-600 hover:bg-purple-500 text-white' :
                'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {statusMutation.isPending ? <Loader2 size={14} className="animate-spin inline" /> : null}
              {' '}{s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main details */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Job Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Customer', value: job.customerName },
                { label: 'Phone', value: job.customerPhone || '—' },
                { label: 'School', value: job.school?.name || '—' },
                { label: 'Design', value: job.designName },
                { label: 'Thread Colors', value: job.threadColors },
                { label: 'Total Items', value: `${job.totalItems} pcs` },
                { label: 'Price/Item', value: formatKES(job.pricePerItem) },
                { label: 'Total Cost', value: formatKES(job.totalCost) },
                { label: 'Deposit Paid', value: formatKES(job.depositPaid) },
                { label: 'Balance Due', value: formatKES(job.balanceDue) },
                { label: 'Due Date', value: formatDate(job.dueDate) },
                { label: 'Received', value: formatDate(job.receivedDate) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-slate-500 text-xs">{label}</p>
                  <p className="text-white">{value}</p>
                </div>
              ))}
            </div>
            {job.notes && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-slate-500 text-xs mb-1">Notes</p>
                <p className="text-slate-300 text-sm">{job.notes}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Garment Items</h2>
            <div className="space-y-2">
              {job.items?.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 bg-slate-800 rounded-xl p-3">
                  <Package size={16} className="text-purple-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{item.garmentType}</p>
                    <p className="text-slate-400 text-xs">
                      Qty: {item.quantity}
                      {item.size && ` · Size: ${item.size}`}
                      {item.color && ` · Color: ${item.color}`}
                      {item.logoPosition && ` · Position: ${item.logoPosition}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Operator assignment */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Operator</h2>
            {job.operator ? (
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-900 rounded-full flex items-center justify-center text-purple-300 text-xs font-bold">
                  {job.operator.name?.charAt(0)}
                </div>
                <p className="text-white text-sm">{job.operator.name}</p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm mb-3">Not assigned</p>
            )}
            <select
              onChange={(e) => e.target.value && assignMutation.mutate(e.target.value)}
              defaultValue=""
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="">Assign operator…</option>
              {operators.map((op: any) => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>

          {/* Status history */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Status History</h2>
            <div className="space-y-3">
              {job.statusHistory?.map((log: any, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-600 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300 text-xs font-medium">{log.toStatus?.replace('_', ' ')}</p>
                    {log.notes && <p className="text-slate-500 text-xs">{log.notes}</p>}
                    <p className="text-slate-600 text-xs">{formatDate(log.createdAt, 'long')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
