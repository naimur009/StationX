export type PaymentMethod = 'cash' | 'card' | 'bkash' | 'nagad' | 'split';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
}

export interface PosState {
  items: CartItem[];
  customer: CustomerInfo | null;
  couponCode: string;
  couponDiscount: number;
  couponType: 'flat' | 'percentage' | null;
  paymentMethod: PaymentMethod;
  paymentSplits: { method: PaymentMethod; amount: number }[];
  submitting: boolean;
}
