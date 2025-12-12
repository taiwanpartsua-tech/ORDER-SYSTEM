/*
  # Create Returns Table

  1. New Tables
    - `returns`
      - `id` (uuid, primary key)
      - `status` (text) - завжди "повернення"
      - `substatus` (text) - підстатус повернення
      - `client_id` (text) - ID клієнта
      - `title` (text) - назва товару
      - `link` (text) - посилання на товар
      - `tracking_pl` (text) - трекінг в Польщі
      - `part_price` (numeric) - вартість запчастини
      - `delivery_cost` (numeric) - вартість доставки
      - `total_cost` (numeric) - загальна вартість
      - `part_number` (text) - номер запчастини
      - `payment_type` (text) - тип оплати
      - `cash_on_delivery` (numeric) - сума побранє
      - `order_date` (date) - дата замовлення
      - `return_tracking_to_supplier` (text) - трекінг повернення поляку
      - `created_at` (timestamptz) - дата створення
      - `updated_at` (timestamptz) - дата оновлення

  2. Security
    - Enable RLS on `returns` table
    - Add policy for anonymous users to read all returns
    - Add policy for anonymous users to insert returns
    - Add policy for anonymous users to update returns
    - Add policy for anonymous users to delete returns
*/

CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'повернення',
  substatus text NOT NULL DEFAULT 'В Арта в хелмі',
  client_id text DEFAULT '',
  title text DEFAULT '',
  link text DEFAULT '',
  tracking_pl text DEFAULT '',
  part_price numeric(15,2) DEFAULT 0,
  delivery_cost numeric(15,2) DEFAULT 0,
  total_cost numeric(15,2) DEFAULT 0,
  part_number text DEFAULT '',
  payment_type text DEFAULT 'оплачено',
  cash_on_delivery numeric(15,2) DEFAULT 0,
  order_date date DEFAULT CURRENT_DATE,
  return_tracking_to_supplier text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to returns"
  ON returns
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to returns"
  ON returns
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to returns"
  ON returns
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to returns"
  ON returns
  FOR DELETE
  TO anon
  USING (true);