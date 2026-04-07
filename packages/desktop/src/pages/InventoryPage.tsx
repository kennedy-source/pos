import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Package, Plus, Search, Filter, AlertTriangle,
  ArrowUp, ArrowDown, ChevronRight, Loader2,
  RefreshCw, BarChart3, Tag
} from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { formatKES, formatDate, StatusBadge } from '../lib/utils';
import toast from 'react-hot-toast';

type ViewTab = 'products' | 'alerts' | 'movements';

export function InventoryPage() {
  const [tab, setTab] = useState<ViewTab>('products');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [showAddStock, setShowAddStock] = useState<any>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: productsData, isPending } = useQuery({
    queryKey: ['products', query, categoryId, schoolId],
    queryFn: () =>
      apiGet<any>('/products', {
        q: query || undefined,
        categoryId: categoryId || undefined,
        schoolId: schoolId || undefined,
        isActive: true,
        limit: 40,
      }),
    enabled: tab === 'products',
  });

  const { data: alertsData } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () => apiGet<any>('/inventory/alerts'),
    enabled: tab === 'alerts',
  });

  const { data: movementsData } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => apiGet<any>('/inventory/transactions', { limit: 30 }),
    enabled: tab === 'movements',
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiGet<any>('/products/categories'),
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: () => apiGet<any>('/products/schools'),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => apiGet<any>('/inventory/summary'),
  });

  const products = (productsData as any)?.data?.data || [];
  const alerts = (alertsData as any)?.data || [];
  const movements = (movementsData as any)?.data?.data || [];
  const categories = (categoriesData as any)?.data || [];
  const schools = (schoolsData as any)?.data || [];
  const summary = (summaryData as any)?.data;

  const adjustStockMutation = useMutation({
    mutationFn: (dto: any) => apiPost('/inventory/adjust', dto),
    onSuccess: () => {
      toast.success('Stock updated successfully');
      setShowAddStock(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Inventory</h1>
          <p className="text-slate-400 text-sm">Manage products, stock levels, and movements</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/inventory/new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Products', value: summary.totalProducts, icon: Package, color: 'text-blue-400' },
            { label: 'Total Variants', value: summary.totalVariants, icon: Tag, color: 'text-purple-400' },
            { label: 'Total Units', value: summary.totalStockUnits?.toLocaleString(), icon: BarChart3, color: 'text-green-400' },
            { label: 'Low Stock Alerts', value: summary.lowStockCount, icon: AlertTriangle, color: summary.lowStockCount > 0 ? 'text-red-400' : 'text-slate-400' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <s.icon size={20} className={s.color} />
                <div>
                  <p className="text-white font-bold text-xl">{s.value}</p>
                  <p className="text-slate-400 text-xs">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {[
          { key: 'products', label: 'Products' },
          { key: 'alerts', label: `Low Stock${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
          { key: 'movements', label: 'Movements' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as ViewTab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Products tab */}
      {tab === 'products' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-2xl px-3 py-2.5 flex-1 min-w-48 shadow-sm shadow-slate-950/20 transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <Search size={16} className="text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, SKU, barcode…"
                className="bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none flex-1"
              />
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All Schools</option>
              {schools.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {isPending ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-slate-400 font-medium px-4 py-3">Product</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">Category / School</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3">Variants</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-3">Price</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3">Stock</th>
                    <th className="text-center text-slate-400 font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    products.map((product: any) => {
                      const totalStock = product.variants?.reduce(
                        (sum: number, v: any) => sum + v.currentStock, 0
                      ) || 0;
                      const hasLowStock = product.variants?.some(
                        (v: any) => v.currentStock <= (v.reorderLevel ?? product.reorderLevel)
                      );

                      return (
                        <tr
                          key={product.id}
                          onClick={() => navigate(`/inventory/${product.id}`)}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors group"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-white font-medium group-hover:text-blue-300 transition-colors">
                                {product.name}
                              </p>
                              <p className="text-slate-500 text-xs font-mono">{product.sku}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-300">{product.category?.name}</p>
                            {product.school && (
                              <p className="text-slate-500 text-xs">{product.school.name}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400">
                            {product.variants?.length || 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="text-green-400 font-medium">{formatKES(product.sellingPrice)}</p>
                            <p className="text-slate-500 text-xs">Cost: {formatKES(product.costPrice)}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${
                              totalStock === 0 ? 'text-red-400' :
                              hasLowStock ? 'text-yellow-400' : 'text-white'
                            }`}>
                              {totalStock}
                            </span>
                            {hasLowStock && (
                              <AlertTriangle size={12} className="inline ml-1 text-yellow-400" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAddStock(product);
                              }}
                              className="px-3 py-1.5 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
                            >
                              Stock In
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-400">No low stock alerts — all items are well stocked!</p>
            </div>
          ) : (
            alerts.map((alert: any) => {
              const name = alert.product?.name || 'Unknown';
              const variantLabel = [alert.variant?.size, alert.variant?.color].filter(Boolean).join(' / ');
              return (
                <div key={alert.id} className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 flex items-center gap-4">
                  <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-white font-medium">{name}</p>
                    <p className="text-slate-400 text-xs">
                      {variantLabel && `${variantLabel} · `}
                      {alert.product?.category?.name} · {alert.product?.school?.name || 'Generic'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold">{alert.currentQty} left</p>
                    <p className="text-slate-500 text-xs">Reorder at: {alert.reorderLevel}</p>
                  </div>
                  <button
                    onClick={() => setShowAddStock(alert.product)}
                    className="bg-red-600/30 hover:bg-red-600/50 border border-red-600/50 text-red-300 rounded-lg px-3 py-1.5 text-xs transition-colors"
                  >
                    Stock In
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Movements tab */}
      {tab === 'movements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Date</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Product</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Type</th>
                <th className="text-center text-slate-400 font-medium px-4 py-3">Qty Change</th>
                <th className="text-center text-slate-400 font-medium px-4 py-3">Stock After</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Reason</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">By</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((txn: any) => (
                <tr key={txn.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {formatDate(txn.createdAt, 'long')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white">{txn.product?.name}</p>
                    {txn.variant && (
                      <p className="text-slate-500 text-xs">
                        {[txn.variant.size, txn.variant.color].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      txn.type === 'STOCK_IN' || txn.type === 'RETURNED'
                        ? 'bg-green-900/40 text-green-400'
                        : txn.type === 'SALE_DEDUCTION'
                        ? 'bg-blue-900/40 text-blue-400'
                        : 'bg-red-900/40 text-red-400'
                    }`}>
                      {txn.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${txn.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {txn.quantity > 0 ? '+' : ''}{txn.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-white">{txn.quantityAfter}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-32 truncate">{txn.reason || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{txn.performedBy?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock In Modal */}
      {showAddStock && (
        <StockInModal
          product={showAddStock}
          onClose={() => setShowAddStock(null)}
          onSubmit={(dto) => adjustStockMutation.mutate(dto)}
          loading={adjustStockMutation.isPending}
        />
      )}
    </div>
  );
}

function StockInModal({
  product, onClose, onSubmit, loading
}: {
  product: any;
  onClose: () => void;
  onSubmit: (dto: any) => void;
  loading: boolean;
}) {
  const [variantId, setVariantId] = useState(product.variants?.[0]?.id || '');
  const [quantity, setQuantity] = useState(10);
  const [type, setType] = useState('STOCK_IN');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [unitCost, setUnitCost] = useState('');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold">Stock Adjustment</h2>
            <p className="text-slate-400 text-sm">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {product.variants?.length > 0 && (
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Variant</label>
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {product.variants.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {[v.size, v.color].filter(Boolean).join(' / ')} — Stock: {v.currentStock}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Transaction Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="STOCK_IN">Stock In (received delivery)</option>
              <option value="ADJUSTMENT">Manual Adjustment</option>
              <option value="DAMAGED">Damaged / Write-off</option>
              <option value="LOST">Lost / Missing</option>
              <option value="STOCK_OUT">Stock Out (other)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {type === 'STOCK_IN' && (
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Unit Cost (KES)</label>
                <input
                  type="number"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={type === 'STOCK_IN' ? 'e.g. Supplier delivery' : 'Reason for adjustment'}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Reference (PO/Invoice No.)</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. PO-2024-001"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-3 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            disabled={loading || !variantId}
            onClick={() => onSubmit({ variantId, productId: product.id, type, quantity, reason, reference, unitCost: unitCost ? parseFloat(unitCost) : undefined })}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white rounded-xl py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
            {type === 'STOCK_IN' ? 'Add Stock' : 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}
