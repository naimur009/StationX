import { create } from 'zustand';
import type { PaymentMethod, CustomerInfo, PosState } from './schema';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface PosActions {
  addItem: (product: { productId: string; name: string; price: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCoupon: (code: string, discount: number, type: 'flat' | 'percentage') => void;
  clearCoupon: () => void;
  setCustomer: (customer: CustomerInfo | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setSubmitting: (submitting: boolean) => void;
  reset: () => void;
}

const initialState: PosState = {
  items: [],
  customer: null,
  couponCode: '',
  couponDiscount: 0,
  couponType: null,
  paymentMethod: 'cash',
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
        items: [...state.items, { ...product, quantity: 1, lineTotal: product.price }],
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
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setSubmitting: (submitting) => set({ submitting }),
  reset: () => set(initialState),
}));
