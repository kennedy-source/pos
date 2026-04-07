// Format KES currency
export function formatKES(amount: number | string | undefined): string {
  const num = parseFloat(String(amount || 0));
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Format date
export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = new Date(date);
  if (format === 'time') {
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Truncate text
export function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

// Generate ESC/POS–compatible receipt HTML for printing
export function generateReceiptHTML(sale: any): string {
  const items = sale.items || [];
  const payments = sale.payments || [];
  const cashier = sale.cashier?.name || 'Staff';
  const customer = sale.customer?.name || 'Walk-in Customer';
  const date = new Date(sale.completedAt || sale.createdAt);

  const itemRows = items
    .map(
      (item: any) => `
      <tr>
        <td style="padding:2px 0">${item.product?.name || 'Item'}${item.variant ? ` (${[item.variant.size, item.variant.color].filter(Boolean).join('/')})` : ''}</td>
        <td style="text-align:center;padding:2px 4px">${item.quantity}</td>
        <td style="text-align:right;padding:2px 0">KES ${Number(item.unitPrice).toLocaleString()}</td>
        <td style="text-align:right;padding:2px 0">KES ${Number(item.lineTotal).toLocaleString()}</td>
      </tr>
    `,
    )
    .join('');

  const paymentRows = payments
    .map(
      (p: any) => `
      <tr>
        <td style="color:#888">${p.method.replace('_', ' ')}${p.mpesaCode ? ` (${p.mpesaCode})` : ''}</td>
        <td style="text-align:right">KES ${Number(p.amount).toLocaleString()}</td>
      </tr>
    `,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt ${sale.receiptNumber}</title>
<style>
  @media print {
    @page { margin: 4mm; size: 80mm auto; }
    body { margin: 0; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 80mm;
    max-width: 80mm;
    margin: 0 auto;
    padding: 4mm;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { font-weight: bold; border-bottom: 1px solid #000; padding: 3px 0; }
  .total-row td { font-weight: bold; font-size: 14px; padding-top: 4px; }
  .footer { margin-top: 8px; font-size: 10px; color: #555; }
</style>
</head>
<body>
<div class="center bold" style="font-size:16px">UniForm Shop Kenya</div>
<div class="center" style="font-size:10px">Westlands, Nairobi | Tel: 0722 000 000</div>
<div class="center" style="font-size:10px">M-Pesa Paybill: 247247 | Acc: UNIFORM</div>

<div class="line"></div>

<table>
  <tr><td>Receipt:</td><td style="text-align:right"><b>${sale.receiptNumber}</b></td></tr>
  <tr><td>Date:</td><td style="text-align:right">${date.toLocaleDateString('en-KE')} ${date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</td></tr>
  <tr><td>Cashier:</td><td style="text-align:right">${cashier}</td></tr>
  <tr><td>Customer:</td><td style="text-align:right">${customer}</td></tr>
</table>

<div class="line"></div>

<table>
  <thead>
    <tr>
      <th style="text-align:left">Item</th>
      <th>Qty</th>
      <th style="text-align:right">Price</th>
      <th style="text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<div class="line"></div>

<table>
  <tr>
    <td>Subtotal</td>
    <td style="text-align:right">KES ${Number(sale.subtotal).toLocaleString()}</td>
  </tr>
  ${Number(sale.discountAmount) > 0 ? `<tr><td style="color:#555">Discount</td><td style="text-align:right;color:#555">- KES ${Number(sale.discountAmount).toLocaleString()}</td></tr>` : ''}
  <tr class="total-row">
    <td>TOTAL</td>
    <td style="text-align:right">KES ${Number(sale.totalAmount).toLocaleString()}</td>
  </tr>
</table>

<div class="line"></div>

<table>${paymentRows}</table>

${Number(sale.changeGiven) > 0 ? `
<div class="line"></div>
<table>
  <tr><td><b>Change</b></td><td style="text-align:right"><b>KES ${Number(sale.changeGiven).toLocaleString()}</b></td></tr>
</table>` : ''}

<div class="line"></div>

<div class="center footer">
  <p>Goods once sold are not returnable without receipt.</p>
  <p>Thank you for shopping with us!</p>
  <p style="margin-top:4px">*** ${sale.receiptNumber} ***</p>
</div>

<script>window.onload = () => window.print();</script>
</body>
</html>`;
}

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

import React from 'react';

// Status badge component
export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    COMPLETED: { bg: 'bg-green-900/40', text: 'text-green-400', label: 'Completed' },
    PENDING: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', label: 'Pending' },
    IN_PROGRESS: { bg: 'bg-blue-900/40', text: 'text-blue-400', label: 'In Progress' },
    DELIVERED: { bg: 'bg-purple-900/40', text: 'text-purple-400', label: 'Delivered' },
    CANCELLED: { bg: 'bg-red-900/40', text: 'text-red-400', label: 'Cancelled' },
    DRAFT: { bg: 'bg-slate-700/40', text: 'text-slate-400', label: 'Draft' },
    PAID: { bg: 'bg-green-900/40', text: 'text-green-400', label: 'Paid' },
    URGENT: { bg: 'bg-red-900/40', text: 'text-red-400', label: 'URGENT' },
    NORMAL: { bg: 'bg-slate-700/40', text: 'text-slate-300', label: 'Normal' },
  };

  const c = config[status] || { bg: 'bg-slate-700/40', text: 'text-slate-400', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
