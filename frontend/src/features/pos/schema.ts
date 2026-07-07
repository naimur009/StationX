export type PaymentMethod = 'cash' | 'card' | 'bkash' | 'nagad';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  taxRate: number;
}

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  role: string;
}

export interface PosState {
  items: CartItem[];
  customer: CustomerInfo | null;
  customerName: string;
  customerPhone: string;
  tableNumber: string;
  servedBy: string;
  couponCode: string;
  couponDiscount: number;
  couponType: 'flat' | 'percentage' | null;
  paymentMethod: PaymentMethod;
  transactionId: string;
  discountPercent: number;
  cashTendered: string;
  submitting: boolean;
}
