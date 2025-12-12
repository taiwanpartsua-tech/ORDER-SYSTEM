import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const error = `Missing Supabase environment variables! URL: ${supabaseUrl ? 'OK' : 'MISSING'}, Key: ${supabaseAnonKey ? 'OK' : 'MISSING'}`;
  console.error(error);
  throw new Error(error);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Supplier = {
  id: string;
  name: string;
  balance?: number;
  balance_pln?: number;
  balance_usd?: number;
  balance_parts_pln?: number;
  balance_delivery_pln?: number;
  balance_receipt_pln?: number;
  balance_cash_on_delivery_pln?: number;
  balance_transport_usd?: number;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  supplier_id: string;
  status: string;
  order_date: string;
  notes: string;
  title: string;
  link: string;
  tracking_pl: string;
  part_price: number;
  delivery_cost: number;
  total_cost: number;
  part_number: string;
  payment_type: string;
  cash_on_delivery: number;
  client_id: string;
  received_pln: number;
  transport_cost_usd: number;
  weight_kg: number;
  verified: boolean;
  archived: boolean;
  archived_at?: string;
  created_at: string;
};

export type Manager = {
  id: string;
  name: string;
  created_at: string;
};

export type Return = {
  id: string;
  status?: string;
  substatus: string;
  client_id?: string;
  title?: string;
  link?: string;
  tracking_pl?: string;
  part_price: number;
  delivery_cost: number;
  total_cost: number;
  part_number?: string;
  payment_type: string;
  cash_on_delivery: number;
  order_date: string;
  return_tracking_to_supplier?: string;
  refund_status?: string;
  discussion_link?: string;
  situation_description?: string;
  manager_id?: string;
  created_at: string;
  updated_at?: string;
};

export type ActiveReceipt = {
  id: string;
  receipt_number: string;
  receipt_date: string;
  status: 'draft' | 'approved' | 'sent_for_settlement' | 'settled';
  supplier_id: string;
  total_pln: number;
  total_usd: number;
  parts_cost_pln: number;
  delivery_cost_pln: number;
  receipt_cost_pln: number;
  cash_on_delivery_pln: number;
  transport_cost_usd: number;
  approved_at?: string;
  settlement_date?: string;
  settled_date?: string;
  created_at: string;
};

export type ReceiptOrder = {
  id: string;
  receipt_id: string;
  order_id: string;
  created_at: string;
};

export type ReceiptItem = {
  id: string;
  receipt_id: string;
  product_name: string;
  quantity: number;
  price_pln: number;
  price_usd: number;
  total_pln: number;
  total_usd: number;
  created_at: string;
};

export type SupplierTransaction = {
  id: string;
  supplier_id: string;
  receipt_id?: string;
  amount_pln: number;
  amount_usd: number;
  parts_cost_pln: number;
  delivery_cost_pln: number;
  receipt_cost_pln: number;
  cash_on_delivery_pln: number;
  transport_cost_usd: number;
  notes: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  transaction_type: 'debit' | 'credit';
  amount_pln: number;
  amount_usd: number;
  cash_on_delivery_pln: number;
  transport_cost_usd: number;
  parts_delivery_pln: number;
  description: string;
  receipt_id?: string;
  transaction_date: string;
  created_at: string;
  created_by: string;
  is_reversed?: boolean;
  reversed_at?: string;
};

export type CardTransaction = {
  id: string;
  transaction_type: 'payment' | 'refund';
  amount: number;
  description: string;
  transaction_date: string;
  receipt_id?: string;
  created_at: string;
};
