export type ProductCategory = 'raw_material' | 'finished_good' | 'packaging' | 'other' | string;

export type OrderStatus = 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer' | 'check' | 'card_payment' ;

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  sku: string;
  unit_price: number;
  stock_quantity: number;
  reorder_point: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: string;
  organization_id: string;
  client_id: string;
  order_number: string;
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    name: string;
    image_url?: string;
  };
  items?: SalesOrderItem[];
  payments?: Payment[];
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  image_url: string;
  total_price: number;
  is_custom_item: boolean;
  created_at: string;
  product?: Product;
}

export interface Payment {
  id: string;
  sales_order_id: string;
  amount: number;
  payment_method: 'cash' | 'mobile_money' | 'bank_transfer' | 'cheque' | 'credit_card';
  transaction_reference: string | null;
  recorded_by: string;
  created_at: string;
  recorded_by_user?: {
    name: string;
  };
} 