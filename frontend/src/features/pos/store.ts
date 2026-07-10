import { create } from 'zustand';
import type { CustomerInfo, PosState } from './schema';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface PosActions {
  addItem: (product: { productId: string; name: string; price: number; vatRate: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCoupon: (code: string, discount: number, type: 'flat' | 'percentage') => void;
  clearCoupon: () => void;
  setCustomer: (customer: CustomerInfo | null) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setTableNumber: (table: string) => void;
  setServedBy: (userId: string) => void;
  setDiscountPercent: (percent: number) => void;
  setSubmitting: (submitting: boolean) => void;
  reset: () => void;
}

const initialState: PosState = {
  items: [],
  customer: null,
  customerName: '',
  customerPhone: '',
  tableNumber: '',
  servedBy: '',
  couponCode: '',
  couponDiscount: 0,
  couponType: null,
  discountPercent: 0,
  submitting: false,
};

export const usePosStore = create<PosState & PosActions>((set) => ({
  ...initialState,
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === product.productId
              ? { ...i, quantity: i.quantity + 1, lineTotal: round2((i.quantity + 1) * i.price) }
              : i
          ),
        };
      }
      return {
        items: [...state.items, { ...product, quantity: 1, lineTotal: product.price, vatRate: product.vatRate }],
      };
    }),
  removeItem: (productId) => set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: quantity < 1
        ? state.items.filter((i) => i.productId !== productId)
        : state.items.map((i) =>
            i.productId === productId ? { ...i, quantity, lineTotal: round2(quantity * i.price) } : i
          ),
    })),
  setCoupon: (couponCode, couponDiscount, couponType) => set({ couponCode, couponDiscount, couponType }),
  clearCoupon: () => set({ couponCode: '', couponDiscount: 0, couponType: null }),
  setCustomer: (customer) => set({ customer }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setTableNumber: (tableNumber) => set({ tableNumber }),
  setServedBy: (servedBy) => set({ servedBy }),
  setDiscountPercent: (discountPercent) => set({ discountPercent }),
  setSubmitting: (submitting) => set({ submitting }),
  reset: () => set(initialState),
}));
