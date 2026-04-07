import { create } from 'zustand';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantLabel?: string; // e.g. "M / Navy"
  sku: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discountAmt: number;
  lineTotal: number;
  maxStock: number;
}

export interface CartCustomer {
  id: string;
  name: string;
  phone?: string;
}

interface CartState {
  items: CartItem[];
  customer: CartCustomer | null;
  discount: number; // overall sale discount in KES
  notes: string;
  saleId: string | null; // draft sale ID from API

  // Actions
  addItem: (item: Omit<CartItem, 'lineTotal' | 'discountAmt'>) => void;
  updateQty: (productId: string, variantId: string | undefined, qty: number) => void;
  removeItem: (productId: string, variantId: string | undefined) => void;
  setItemDiscount: (productId: string, variantId: string | undefined, discount: number) => void;
  setDiscount: (discount: number) => void;
  setCustomer: (customer: CartCustomer | null) => void;
  setNotes: (notes: string) => void;
  setSaleId: (id: string | null) => void;
  clearCart: () => void;

  // Computed
  subtotal: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  notes: '',
  saleId: null,

  addItem: (newItem) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === newItem.productId && i.variantId === newItem.variantId,
      );

      if (existing) {
        const newQty = Math.min(existing.quantity + newItem.quantity, newItem.maxStock);
        return {
          items: state.items.map((i) =>
            i.productId === newItem.productId && i.variantId === newItem.variantId
              ? { ...i, quantity: newQty, lineTotal: i.unitPrice * newQty - i.discountAmt }
              : i,
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            ...newItem,
            discountAmt: 0,
            lineTotal: newItem.unitPrice * newItem.quantity,
          },
        ],
      };
    });
  },

  updateQty: (productId, variantId, qty) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, quantity: Math.max(1, qty), lineTotal: i.unitPrice * Math.max(1, qty) - i.discountAmt }
          : i,
      ),
    }));
  },

  removeItem: (productId, variantId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productId === productId && i.variantId === variantId),
      ),
    }));
  },

  setItemDiscount: (productId, variantId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, discountAmt: discount, lineTotal: i.unitPrice * i.quantity - discount }
          : i,
      ),
    }));
  },

  setDiscount: (discount) => set({ discount }),
  setCustomer: (customer) => set({ customer }),
  setNotes: (notes) => set({ notes }),
  setSaleId: (id) => set({ saleId: id }),

  clearCart: () =>
    set({ items: [], customer: null, discount: 0, notes: '', saleId: null }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.lineTotal, 0),
  total: () => {
    const sub = get().items.reduce((sum, i) => sum + i.lineTotal, 0);
    return Math.max(0, sub - get().discount);
  },
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
