/*
  # Add Receipt Snapshots for Comparison

  1. New Table
    - `receipt_order_snapshots` - зберігає оригінальні значення замовлень на момент створення прийомки
      - `id` (uuid, primary key)
      - `receipt_id` (uuid, foreign key to active_receipts)
      - `order_id` (uuid, foreign key to orders)
      - `original_weight_kg` (numeric) - оригінальна вага
      - `original_part_price` (numeric) - оригінальна вартість запчастин
      - `original_delivery_cost` (numeric) - оригінальна доставка
      - `original_received_pln` (numeric) - оригінальне побранє
      - `original_cash_on_delivery` (numeric) - оригінальне побранє
      - `original_transport_cost_usd` (numeric) - оригінальне перевезення
      - `created_at` (timestamptz)
    
  2. Security
    - Enable RLS on snapshots table
    - Add policies for anonymous access (same as other tables)
    
  3. Notes
    - Snapshots створюються автоматично при формуванні прийомки
    - Використовуються для порівняння оригінальних і відредагованих значень
*/

CREATE TABLE IF NOT EXISTS receipt_order_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  original_weight_kg numeric(12,3) DEFAULT 0,
  original_part_price numeric(12,2) DEFAULT 0,
  original_delivery_cost numeric(12,2) DEFAULT 0,
  original_received_pln numeric(12,2) DEFAULT 0,
  original_cash_on_delivery numeric(12,2) DEFAULT 0,
  original_transport_cost_usd numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE receipt_order_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to receipt_order_snapshots"
  ON receipt_order_snapshots
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to receipt_order_snapshots"
  ON receipt_order_snapshots
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to receipt_order_snapshots"
  ON receipt_order_snapshots
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from receipt_order_snapshots"
  ON receipt_order_snapshots
  FOR DELETE
  TO anon
  USING (true);