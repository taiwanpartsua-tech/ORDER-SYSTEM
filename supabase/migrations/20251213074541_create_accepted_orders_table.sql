-- Create Accepted Orders Table
-- 
-- 1. New Tables
--   - accepted_orders: Stores orders that have been accepted through receipts
-- 
-- 2. Security
--   - Enable RLS on accepted_orders table
--   - Add policies for public read access

CREATE TABLE IF NOT EXISTS accepted_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE SET NULL,
  receipt_number text NOT NULL,
  order_number text,
  tracking_number text,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  weight_kg numeric(10, 2) DEFAULT 0,
  part_price numeric(12, 2) DEFAULT 0,
  delivery_cost numeric(12, 2) DEFAULT 0,
  received_pln numeric(12, 2) DEFAULT 0,
  cash_on_delivery numeric(12, 2) DEFAULT 0,
  transport_cost_usd numeric(12, 2) DEFAULT 0,
  payment_type text,
  accepted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accepted_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to accepted_orders"
  ON accepted_orders
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to accepted_orders"
  ON accepted_orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to accepted_orders"
  ON accepted_orders
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from accepted_orders"
  ON accepted_orders
  FOR DELETE
  USING (true);