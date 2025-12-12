/*
  # Create Receipt Orders Tables

  1. New Tables
    - `receipt_orders` - Links orders to receipts (many-to-many relationship)
      - `id` (uuid, primary key)
      - `receipt_id` (uuid, foreign key to active_receipts)
      - `order_id` (uuid, foreign key to orders)
      - `created_at` (timestamptz)
    
    - `receipt_order_snapshots` - Stores original values when order is added to receipt
      - `id` (uuid, primary key)
      - `receipt_id` (uuid, foreign key to active_receipts)
      - `order_id` (uuid, foreign key to orders)
      - `original_weight_kg` (numeric)
      - `original_part_price` (numeric)
      - `original_delivery_cost` (numeric)
      - `original_received_pln` (numeric)
      - `original_cash_on_delivery` (numeric)
      - `original_transport_cost_usd` (numeric)
      - `created_at` (timestamptz)
    
  2. Security
    - Enable RLS on both tables
    - Add policies for anonymous access (matching orders and active_receipts policies)
*/

-- Create receipt_orders table
CREATE TABLE IF NOT EXISTS receipt_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(receipt_id, order_id)
);

-- Create receipt_order_snapshots table
CREATE TABLE IF NOT EXISTS receipt_order_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  original_weight_kg numeric(15,3) DEFAULT 0,
  original_part_price numeric(15,2) DEFAULT 0,
  original_delivery_cost numeric(15,2) DEFAULT 0,
  original_received_pln numeric(15,2) DEFAULT 0,
  original_cash_on_delivery numeric(15,2) DEFAULT 0,
  original_transport_cost_usd numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(receipt_id, order_id)
);

-- Enable RLS
ALTER TABLE receipt_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_order_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access
CREATE POLICY "Allow anonymous select on receipt_orders"
  ON receipt_orders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on receipt_orders"
  ON receipt_orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on receipt_orders"
  ON receipt_orders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on receipt_orders"
  ON receipt_orders FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous select on receipt_order_snapshots"
  ON receipt_order_snapshots FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on receipt_order_snapshots"
  ON receipt_order_snapshots FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on receipt_order_snapshots"
  ON receipt_order_snapshots FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on receipt_order_snapshots"
  ON receipt_order_snapshots FOR DELETE
  TO anon
  USING (true);