import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Barcode,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  Pencil,
  CheckCircle2,
} from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '../lib/api';
import { formatKES, formatDate, StatusBadge } from '../lib/utils';
import toast from 'react-hot-toast';

const STOCK_TYPES = [
  { value: 'STOCK_IN', label: 'Stock In' },
  { value: 'ADJUSTMENT', label: 'Manual Adjustment' },
  { value: 'DAMAGED', label: 'Damaged / Write-off' },
  { value: 'LOST', label: 'Lost / Missing' },
  { value: 'STOCK_OUT', label: 'Stock Out' },
];

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    buyingPrice: '',
    sellingPrice: '',
    reorderLevel: '',
  });
  const [selectedVariant, setSelectedVariant] = useState('');
  const [stockType, setStockType] = useState('STOCK_IN');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockReason, setStockReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { data: productData, isPending: productLoading } = useQuery({
    queryKey: ['product-detail', id],
    queryFn: () => apiGet<any>(`/products/${id}`),
    enabled: !!id,
  });

  const { data: movementsData, isPending: movementsLoading } = useQuery({
    queryKey: ['product-movements', id],
    queryFn: () => apiGet<any>('/inventory/transactions', { productId: id, limit: 40 }),
    enabled: !!id,
  });

  const product = (productData as any)?.data || (productData as any);
  const variants = product?.variants || [];
  const movements = (movementsData as any)?.data?.data || [];

  const totalStock = useMemo(
    () => variants.reduce((sum: number, item: any) => sum + (item.currentStock || 0), 0),
    [variants],
  );

  const lowStockCount = useMemo(
    () => variants.filter((item: any) => item.currentStock <= (item.reorderLevel ?? product?.reorderLevel ?? 0)).length,
    [variants, product],
  );

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      buyingPrice: product.costPrice?.toString() || '',
      sellingPrice: product.sellingPrice?.toString() || '',
      reorderLevel: product.reorderLevel?.toString() || '',
    });
    setSelectedVariant(variants?.[0]?.id || '');
  }, [product, variants]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => apiPatch(`/products/${id}`, payload),
    onSuccess: () => {
      toast.success('Product updated successfully');
      queryClient.invalidateQueries({ queryKey: ['product-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const stockMutation = useMutation({
    mutationFn: (payload: any) => apiPost('/inventory/adjust', payload),
    onSuccess: () => {
      toast.success('Stock adjustment saved');
      setStockQuantity(1);
      setStockReason('');
      queryClient.invalidateQueries({ queryKey: ['product-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['product-movements', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const productNotFound = !product && !productLoading;

  if (productLoading || movementsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (productNotFound) {
    return (
      <div className="p-6 text-slate-500">
        Product not found. <button onClick={() => navigate('/inventory')} className="text-blue-500 underline">Back to inventory</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors mb-3"
          >
            <ArrowLeft size={16} /> Back to inventory
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-white text-3xl font-semibold">{product.name}</h1>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Product detail</span>
          </div>
          <div className="text-slate-500 text-sm mt-1">Manage variants, stock movements, SKU & barcode, and update pricing.</div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="btn btn-secondary"
          >
            <Pencil size={16} /> {isEditing ? 'Cancel Edit' : 'Edit Product'}
          </button>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['product-detail', id] })}
            className="btn btn-ghost"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-slate-400 uppercase tracking-[0.18em] text-xs">Summary</p>
              <h2 className="text-white text-xl font-semibold mt-2">Product overview</h2>
            </div>
            <div className="rounded-2xl bg-blue-500/10 px-3 py-2 text-blue-500 text-xs font-semibold">{product.isActive ? 'Active' : 'Inactive'}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">SKU</p>
              <p className="text-slate-900 bg-slate-100 inline-block rounded-xl px-3 py-2 mt-1 text-sm font-medium shadow-sm">{product.sku || '—'}</p>
            </div>
            <div>
              <p className="text-slate-400">Barcode</p>
              <p className="flex items-center gap-2 text-slate-900 bg-slate-100 rounded-xl px-3 py-2 mt-1 text-sm font-medium shadow-sm">
                <Barcode size={14} /> {product.barcode || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Category</p>
              <p className="text-slate-700 mt-1 text-sm">{product.category?.name || 'Uncategorized'}</p>
            </div>
            <div>
              <p className="text-slate-400">School</p>
              <p className="text-slate-700 mt-1 text-sm">{product.school?.name || 'General'}</p>
            </div>
            <div>
              <p className="text-slate-400">Price</p>
              <p className="text-slate-900 mt-1 text-lg font-semibold">{formatKES(product.sellingPrice)}</p>
            </div>
            <div>
              <p className="text-slate-400">Cost</p>
              <p className="text-slate-900 mt-1 text-lg font-semibold">{formatKES(product.costPrice)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-slate-400 uppercase tracking-[0.16em] text-[11px]">Total stock</p>
              <p className="text-2xl font-semibold text-slate-900 mt-3">{totalStock}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-slate-400 uppercase tracking-[0.16em] text-[11px]">Variants</p>
              <p className="text-2xl font-semibold text-slate-900 mt-3">{variants.length}</p>
              {lowStockCount > 0 && (
                <p className="text-amber-600 text-xs mt-1">{lowStockCount} low stock</p>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 grid grid-cols-1 gap-6">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div>
                <h2 className="text-white text-xl font-semibold">Variant inventory</h2>
                <p className="text-slate-400 text-sm mt-1">Review stock levels, reorder thresholds, and variant SKU details.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100/90 px-3 py-2 text-sm text-slate-700 shadow-sm">
                <Tag size={16} /> {variants.length} variants
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200/60">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left text-slate-500 font-semibold px-4 py-3">Variant</th>
                    <th className="text-left text-slate-500 font-semibold px-4 py-3">SKU</th>
                    <th className="text-center text-slate-500 font-semibold px-4 py-3">Stock</th>
                    <th className="text-center text-slate-500 font-semibold px-4 py-3">Reorder</th>
                    <th className="text-left text-slate-500 font-semibold px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-500 py-8">No variants available.</td>
                    </tr>
                  ) : (
                    variants.map((variant: any) => {
                      const lowStock = variant.currentStock <= (variant.reorderLevel ?? product?.reorderLevel ?? 0);
                      return (
                        <tr key={variant.id} className="border-t border-slate-200/80 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedVariant(variant.id)}>
                          <td className="px-4 py-4 text-slate-800">
                            {[variant.size, variant.color].filter(Boolean).join(' / ') || 'Default'}
                          </td>
                          <td className="px-4 py-4 text-slate-600">{variant.sku || '—'}</td>
                          <td className="px-4 py-4 text-center font-semibold text-slate-900">{variant.currentStock}</td>
                          <td className="px-4 py-4 text-center text-slate-600">{variant.reorderLevel ?? product?.reorderLevel ?? '—'}</td>
                          <td className="px-4 py-4">
                            <StatusBadge status={lowStock ? 'PENDING' : 'COMPLETED'} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card p-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div>
                <h2 className="text-white text-xl font-semibold">Product details</h2>
                <p className="text-slate-400 text-sm mt-1">Pricing, barcode, SKU and reorder thresholds.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 text-xs mb-2 block">Product Name</label>
                  <input
                    value={form.name}
                    disabled={!isEditing}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs mb-2 block">SKU</label>
                  <input
                    value={form.sku}
                    disabled={!isEditing}
                    onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs mb-2 block">Barcode</label>
                  <input
                    value={form.barcode}
                    disabled={!isEditing}
                    onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs mb-2 block">Reorder Level</label>
                  <input
                    type="number"
                    value={form.reorderLevel}
                    disabled={!isEditing}
                    onChange={(e) => setForm((prev) => ({ ...prev, reorderLevel: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs mb-2 block">Cost Price</label>
                  <input
                    type="number"
                    value={form.buyingPrice}
                    disabled={!isEditing}
                    onChange={(e) => setForm((prev) => ({ ...prev, buyingPrice: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs mb-2 block">Selling Price</label>
                  <input
                    type="number"
                    value={form.sellingPrice}
                    disabled={!isEditing}
                    onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl bg-slate-50 p-5 border border-slate-200/70">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-slate-900 font-semibold">Quick stock adjustment</h3>
                    <p className="text-slate-500 text-sm">Apply changes to the selected variant.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600">
                    <Plus size={14} /> {stockType.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-slate-500 text-xs mb-2 block">Variant</label>
                    <select
                      value={selectedVariant}
                      onChange={(e) => setSelectedVariant(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    >
                      {variants.map((variant: any) => (
                        <option key={variant.id} value={variant.id}>
                          {[variant.size, variant.color].filter(Boolean).join(' / ') || 'Default'} — {variant.sku || 'SKU'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 text-xs mb-2 block">Change type</label>
                    <select
                      value={stockType}
                      onChange={(e) => setStockType(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    >
                      {STOCK_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 text-xs mb-2 block">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(parseInt(e.target.value) || 1)}
                      className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 text-xs mb-2 block">Reason</label>
                    <input
                      value={stockReason}
                      onChange={(e) => setStockReason(e.target.value)}
                      placeholder="Supplier delivery, damage, returned"
                      className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!selectedVariant || stockMutation.isPending}
                    onClick={() => stockMutation.mutate({
                      productId: id,
                      variantId: selectedVariant,
                      type: stockType,
                      quantity: stockQuantity,
                      reason: stockReason || undefined,
                    })}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {stockMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Apply stock change
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <h2 className="text-white text-xl font-semibold">Movement history</h2>
              <p className="text-slate-400 text-sm mt-1">Recent stock transactions for this product.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
              <RefreshCw size={14} /> {movements.length} entries
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/70">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left text-slate-500 font-semibold px-4 py-3">Date</th>
                  <th className="text-left text-slate-500 font-semibold px-4 py-3">Reference</th>
                  <th className="text-left text-slate-500 font-semibold px-4 py-3">Type</th>
                  <th className="text-center text-slate-500 font-semibold px-4 py-3">Qty</th>
                  <th className="text-center text-slate-500 font-semibold px-4 py-3">After</th>
                  <th className="text-left text-slate-500 font-semibold px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-500 py-8">No stock movements recorded yet.</td>
                  </tr>
                ) : (
                  movements.map((transaction: any) => (
                    <tr key={transaction.id} className="border-t border-slate-200/70 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-slate-600 text-xs">{formatDate(transaction.createdAt, 'long')}</td>
                      <td className="px-4 py-4 text-slate-700">{transaction.reference || transaction.reason || '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                          transaction.type === 'STOCK_IN' || transaction.type === 'RETURNED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : transaction.type === 'SALE_DEDUCTION'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {transaction.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className={`px-4 py-4 text-center font-semibold ${transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                      </td>
                      <td className="px-4 py-4 text-center text-slate-700">{transaction.quantityAfter}</td>
                      <td className="px-4 py-4 text-slate-600">{transaction.performedBy?.name || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-5 space-y-5">
          <div>
            <h2 className="text-white text-xl font-semibold">Edit product</h2>
            <p className="text-slate-400 text-sm mt-1">Update product metadata, pricing, and reorder settings.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-slate-500 text-xs mb-2 block">Name</label>
                <input
                  value={form.name}
                  disabled={!isEditing}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-2 block">SKU</label>
                <input
                  value={form.sku}
                  disabled={!isEditing}
                  onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-2 block">Barcode</label>
                <input
                  value={form.barcode}
                  disabled={!isEditing}
                  onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 text-xs mb-2 block">Cost price</label>
                  <input
                    type="number"
                    value={form.buyingPrice}
                    disabled={!isEditing}
                    onChange={(e) => setForm((prev) => ({ ...prev, buyingPrice: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs mb-2 block">Selling price</label>
                  <input
                    type="number"
                    value={form.sellingPrice}
                    disabled={!isEditing}
                    onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 text-xs mb-2 block">Reorder threshold</label>
                <input
                  type="number"
                  value={form.reorderLevel}
                  disabled={!isEditing}
                  onChange={(e) => setForm((prev) => ({ ...prev, reorderLevel: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!isEditing || updateMutation.isPending}
            onClick={() => updateMutation.mutate({
              name: form.name,
              sku: form.sku,
              barcode: form.barcode,
              costPrice: parseFloat(form.buyingPrice) || 0,
              sellingPrice: parseFloat(form.sellingPrice) || 0,
              reorderLevel: parseInt(form.reorderLevel) || 0,
            })}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Save product
          </button>
        </div>
      </div>
    </div>
  );
}
