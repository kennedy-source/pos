import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, Plus, Minus, Trash2, CreditCard, Banknote,
  Smartphone, Printer, CheckCircle, AlertCircle, Barcode,
  User, Tag, ChevronDown, Loader2
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { apiGet, apiPost } from '../lib/api';
import toast from 'react-hot-toast';
import { formatKES, generateReceiptHTML } from '../lib/utils';

// ─── Sub-components ───────────────────────────────────────────

function ProductSearch({ onAdd }: { onAdd: (product: any, variant: any) => void }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['pos-search', query],
    queryFn: () => apiGet<any>('/products', { q: query, isActive: true, limit: 12 }),
    enabled: query.length >= 2,
    staleTime: 5000,
  });

  const products = (data as any)?.data?.data || [];

  // Barcode scan handler (fast input = barcode)
  useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimer: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && barcodeBuffer.length > 3) {
        handleBarcodeSearch(barcodeBuffer);
        barcodeBuffer = '';
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer += e.key;
        clearTimeout(barcodeTimer);
        barcodeTimer = setTimeout(() => { barcodeBuffer = ''; }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeSearch = async (barcode: string) => {
    try {
      const res = await apiGet<any>(`/products/barcode/${barcode}`);
      const result = (res as any).data;
      if (result.type === 'product') {
        const p = result.data;
        const v = p.variants[0];
        if (v) onAdd(p, v);
      } else if (result.type === 'variant') {
        const v = result.data;
        onAdd(v.product, v);
      }
      toast.success('Product scanned');
    } catch {
      toast.error(`No product found for barcode: ${barcode}`);
    }
  };

  const handleSelect = (product: any, variant: any) => {
    onAdd(product, variant);
    setQuery('');
    setFocused(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
        <Search size={18} className="text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search by name, SKU, barcode or school… (or scan barcode)"
          className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none"
          autoFocus
        />
        {isFetching && <Loader2 size={16} className="text-slate-400 animate-spin" />}
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        )}
        <Barcode size={16} className="text-slate-500" />
      </div>

      {/* Results dropdown */}
      {focused && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
          {products.length === 0 && !isFetching ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              No products found for "{query}"
            </div>
          ) : (
            products.map((product: any) => (
              <div key={product.id}>
                {product.variants && product.variants.length > 0 ? (
                  product.variants.map((variant: any) => (
                    <button
                      key={variant.id}
                      onClick={() => handleSelect(product, variant)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors text-left border-b border-slate-700/50 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{product.name}</p>
                        <p className="text-slate-400 text-xs">
                          {variant.size && `Size: ${variant.size}`}
                          {variant.color && ` • ${variant.color}`}
                          {' • '}SKU: {variant.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm font-semibold">
                          {formatKES(variant.sellingPrice ?? product.sellingPrice)}
                        </p>
                        <p className={`text-xs ${variant.currentStock <= 3 ? 'text-red-400' : 'text-slate-400'}`}>
                          Stock: {variant.currentStock}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  // Fallback if no variants (should not happen after fix)
                  <button
                    onClick={() => handleSelect(product, null)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{product.name}</p>
                      <p className="text-slate-400 text-xs">{product.sku} • {product.school?.name || 'Generic'}</p>
                    </div>
                    <span className="text-green-400 text-sm font-semibold">{formatKES(product.sellingPrice)}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CartItemRow({ item }: { item: any }) {
  const { updateQty, removeItem, setItemDiscount } = useCartStore();
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  const applyDiscount = () => {
    const d = parseFloat(discountInput);
    if (!isNaN(d) && d >= 0 && d <= item.unitPrice * item.quantity) {
      setItemDiscount(item.productId, item.variantId, d);
      setShowDiscount(false);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{item.name}</p>
          {item.variantLabel && (
            <p className="text-slate-400 text-xs">{item.variantLabel}</p>
          )}
          <p className="text-slate-500 text-xs">{item.sku}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-green-400 text-sm font-semibold">{formatKES(item.lineTotal)}</p>
          {item.discountAmt > 0 && (
            <p className="text-red-400 text-xs">-{formatKES(item.discountAmt)}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-700 rounded-lg">
          <button
            onClick={() => updateQty(item.productId, item.variantId, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="text-white text-sm font-medium w-8 text-center">{item.quantity}</span>
          <button
            onClick={() => updateQty(item.productId, item.variantId, item.quantity + 1)}
            disabled={item.quantity >= item.maxStock}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <span className="text-slate-500 text-xs">@ {formatKES(item.unitPrice)}</span>

        <button
          onClick={() => setShowDiscount(!showDiscount)}
          className="ml-auto text-slate-400 hover:text-yellow-400 transition-colors"
          title="Apply discount"
        >
          <Tag size={14} />
        </button>

        <button
          onClick={() => removeItem(item.productId, item.variantId)}
          className="text-slate-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {showDiscount && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            placeholder="Discount (KES)"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-yellow-500"
            autoFocus
          />
          <button
            onClick={applyDiscount}
            className="bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Apply
          </button>
          <button onClick={() => setShowDiscount(false)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function PaymentModal({
  total,
  onClose,
  onComplete,
}: {
  total: number;
  onClose: () => void;
  onComplete: (payments: any[]) => void;
}) {
  const [method, setMethod] = useState<'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'MIXED'>('CASH');
  const [cashAmount, setCashAmount] = useState(total.toString());
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState(total.toString());
  const [bankRef, setBankRef] = useState('');
  const [bankAmount, setBankAmount] = useState('');

  const cashNum = parseFloat(cashAmount) || 0;
  const change = method === 'CASH' ? Math.max(0, cashNum - total) : 0;

  const handlePay = () => {
    const payments: any[] = [];

    if (method === 'CASH') {
      if (cashNum < total) {
        toast.error(`Cash is less than total. Need at least ${formatKES(total)}`);
        return;
      }
      payments.push({ method: 'CASH', amount: total });
    } else if (method === 'MPESA') {
      if (!mpesaPhone) { toast.error('Enter M-Pesa phone number'); return; }
      payments.push({ method: 'MPESA', amount: parseFloat(mpesaAmount) || total, mpesaPhone });
    } else if (method === 'BANK_TRANSFER') {
      if (!bankRef) { toast.error('Enter bank reference'); return; }
      payments.push({ method: 'BANK_TRANSFER', amount: parseFloat(bankAmount) || total, bankRef });
    } else if (method === 'MIXED') {
      const cash = parseFloat(cashAmount) || 0;
      const mpesa = parseFloat(mpesaAmount) || 0;
      const bank = parseFloat(bankAmount) || 0;
      const sum = cash + mpesa + bank;
      if (sum < total) { toast.error(`Payments total (${formatKES(sum)}) is less than ${formatKES(total)}`); return; }
      if (cash > 0) payments.push({ method: 'CASH', amount: cash });
      if (mpesa > 0) payments.push({ method: 'MPESA', amount: mpesa, mpesaPhone });
      if (bank > 0) payments.push({ method: 'BANK_TRANSFER', amount: bank, bankRef });
    }

    onComplete(payments);
  };

  const quickCash = [
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
    Math.ceil(total / 1000) * 1000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 3);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-white font-semibold text-lg">Payment</h3>
            <p className="text-slate-400 text-sm">Amount due: <span className="text-green-400 font-bold text-lg">{formatKES(total)}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Payment method tabs */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'CASH', icon: Banknote, label: 'Cash' },
              { key: 'MPESA', icon: Smartphone, label: 'M-Pesa' },
              { key: 'BANK_TRANSFER', icon: CreditCard, label: 'Bank' },
              { key: 'MIXED', icon: null, label: 'Mixed' },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key as any)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                  method === m.key
                    ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {m.icon && <m.icon size={18} />}
                {!m.icon && <span className="text-lg font-bold">+</span>}
                {m.label}
              </button>
            ))}
          </div>

          {/* Cash */}
          {(method === 'CASH' || method === 'MIXED') && (
            <div className="space-y-2">
              {method === 'MIXED' && <label className="text-slate-400 text-xs font-medium">Cash Amount (KES)</label>}
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Cash amount"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-green-500 transition-colors"
              />
              {method === 'CASH' && (
                <>
                  <div className="flex gap-2">
                    {quickCash.map((v) => (
                      <button
                        key={v}
                        onClick={() => setCashAmount(v.toString())}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg py-2 text-sm transition-colors"
                      >
                        {formatKES(v)}
                      </button>
                    ))}
                  </div>
                  {cashNum >= total && (
                    <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-green-400 text-sm">Change</span>
                      <span className="text-green-400 font-bold text-lg">{formatKES(change)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* M-Pesa */}
          {(method === 'MPESA' || method === 'MIXED') && (
            <div className="space-y-2">
              {method === 'MIXED' && <label className="text-slate-400 text-xs font-medium">M-Pesa</label>}
              <input
                type="tel"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
              />
              {method === 'MIXED' && (
                <input
                  type="number"
                  value={mpesaAmount}
                  onChange={(e) => setMpesaAmount(e.target.value)}
                  placeholder="M-Pesa amount"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-green-500 transition-colors"
                />
              )}
              <p className="text-slate-500 text-xs">Customer will receive STK push on their phone</p>
            </div>
          )}

          {/* Bank */}
          {(method === 'BANK_TRANSFER' || method === 'MIXED') && (
            <div className="space-y-2">
              {method === 'MIXED' && <label className="text-slate-400 text-xs font-medium">Bank Transfer</label>}
              <input
                type="text"
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                placeholder="Bank reference / EFT number"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              {method === 'MIXED' && (
                <input
                  type="number"
                  value={bankAmount}
                  onChange={(e) => setBankAmount(e.target.value)}
                  placeholder="Bank amount"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              )}
            </div>
          )}

          <button
            onClick={handlePay}
            className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white rounded-xl py-4 font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-600/30"
          >
            <CheckCircle size={22} />
            Confirm Payment — {formatKES(total)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main POS Page ────────────────────────────────────────────

export function POSPage() {
  const cart = useCartStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [showPayment, setShowPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [overallDiscount, setOverallDiscount] = useState('');

  const addToCart = useCallback((product: any, variant: any | null) => {
    // Always use the first variant (default variant) if none is provided
    const selectedVariant = variant || product.variants?.[0];
    
    if (!selectedVariant) {
      toast.error(`${product.name} has no available variants`);
      return;
    }

    const price = selectedVariant.sellingPrice ?? product.sellingPrice;
    const cost = selectedVariant.costPrice ?? product.costPrice;
    const stock = selectedVariant.currentStock ?? 0;

    if (stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    cart.addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      variantLabel: [selectedVariant.size, selectedVariant.color].filter(Boolean).join(' / ') || undefined,
      sku: selectedVariant.sku ?? product.sku,
      unitPrice: parseFloat(price),
      costPrice: parseFloat(cost),
      quantity: 1,
      maxStock: stock,
    });
  }, [cart]);

  const completeSaleMutation = useMutation({
    mutationFn: async (payments: any[]) => {
      // 1. Create draft sale
      const draftRes = await apiPost<any>('/sales/draft', {
        customerId: cart.customer?.id,
        items: cart.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
          discountAmt: i.discountAmt,
        })),
        discountAmount: cart.discount,
      });

      const saleId = (draftRes as any).data.id;

      // 2. Complete the sale
      const completeRes = await apiPost<any>(`/sales/${saleId}/complete`, { payments });
      return (completeRes as any).data;
    },
    onSuccess: (sale) => {
      setLastReceipt(sale);
      cart.clearCart();
      setShowPayment(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sale completed! 🎉');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to complete sale');
    },
  });

  const handleApplyDiscount = () => {
    const d = parseFloat(overallDiscount);
    if (!isNaN(d) && d >= 0) {
      cart.setDiscount(d);
    }
  };

  const printReceipt = () => {
    if (!lastReceipt) return;
    const html = generateReceiptHTML(lastReceipt);
    if ((window as any).electronAPI) {
      (window as any).electronAPI.printReceipt(html);
    } else {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.print(); }
    }
  };

  const total = cart.total();

  return (
    <div className="flex h-full bg-slate-950">
      {/* Left: Product search + cart */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Point of Sale</h1>
            <p className="text-slate-400 text-sm">
              {user?.name} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {lastReceipt && (
            <button
              onClick={printReceipt}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <Printer size={16} />
              Reprint Receipt
            </button>
          )}
        </div>

        {/* Product Search */}
        <ProductSearch onAdd={addToCart} />

        {/* Cart */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-600">
              <ShoppingCart size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Search for a product or scan a barcode</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <CartItemRow key={`${item.productId}-${item.variantId}`} item={item} />
            ))
          )}
        </div>
      </div>

      {/* Right: Order summary */}
      <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col p-4 gap-4">
        {/* Customer */}
        <div className="bg-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Customer</span>
            {cart.customer && (
              <button onClick={() => cart.setCustomer(null)} className="text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          {cart.customer ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {cart.customer.name.charAt(0)}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{cart.customer.name}</p>
                <p className="text-slate-400 text-xs">{cart.customer.phone}</p>
              </div>
            </div>
          ) : (
            <CustomerPicker onSelect={cart.setCustomer} />
          )}
        </div>

        {/* Order totals */}
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Items ({cart.itemCount()})</span>
              <span className="text-white">{formatKES(cart.subtotal())}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(e.target.value)}
                placeholder="Discount (KES)"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-yellow-400 text-sm focus:outline-none focus:border-yellow-500"
              />
              <button
                onClick={handleApplyDiscount}
                className="bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/50 text-yellow-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              >
                Apply
              </button>
            </div>

            {cart.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-yellow-400">Discount</span>
                <span className="text-yellow-400">-{formatKES(cart.discount)}</span>
              </div>
            )}

            <div className="border-t border-slate-800 pt-2 flex justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-green-400 font-bold text-xl">{formatKES(total)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.items.length === 0 || completeSaleMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl py-4 font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-green-600/20 flex items-center justify-center gap-3"
          >
            {completeSaleMutation.isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <CreditCard size={20} />
            )}
            {completeSaleMutation.isPending ? 'Processing...' : `Pay ${formatKES(total)}`}
          </button>

          <button
            onClick={() => cart.clearCart()}
            disabled={cart.items.length === 0}
            className="w-full bg-slate-800 hover:bg-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 hover:border-red-700/50 text-slate-400 hover:text-red-400 rounded-xl py-2.5 text-sm transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Clear Cart
          </button>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          total={total}
          onClose={() => setShowPayment(false)}
          onComplete={(payments) => completeSaleMutation.mutate(payments)}
        />
      )}
    </div>
  );
}

// Missing import fix
function ShoppingCart({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function CustomerPicker({ onSelect }: { onSelect: (c: any) => void }) {
  const [query, setQuery] = useState('');
  const [show, setShow] = useState(false);

  const { data } = useQuery({
    queryKey: ['customer-search', query],
    queryFn: () => apiGet<any>('/customers', { q: query, limit: 5 }),
    enabled: query.length >= 2,
  });

  const customers = (data as any)?.data?.data || [];

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder="Search customer…"
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
      />
      {show && customers.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          {customers.map((c: any) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setQuery(''); setShow(false); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors"
            >
              <p className="text-white text-sm">{c.name}</p>
              <p className="text-slate-400 text-xs">{c.phone}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
