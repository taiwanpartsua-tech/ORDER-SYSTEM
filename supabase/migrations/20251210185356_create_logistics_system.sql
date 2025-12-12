/*
  # Система управління замовленнями та прийомом товару

  ## Таблиці
  
  ### 1. suppliers (Постачальники)
  - `id` (uuid, primary key)
  - `name` (text) - Назва постачальника
  - `balance_pln` (decimal) - Баланс в злотих
  - `balance_usd` (decimal) - Баланс в доларах
  - `created_at` (timestamptz)

  ### 2. orders (Замовлення)
  - `id` (uuid, primary key)
  - `order_number` (text) - Номер замовлення
  - `supplier_id` (uuid) - Постачальник
  - `status` (text) - Статус замовлення
  - `order_date` (date)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 3. active_receipts (Активний прийом товару)
  - `id` (uuid, primary key)
  - `order_id` (uuid) - Посилання на замовлення
  - `receipt_number` (text) - Номер прийомки
  - `receipt_date` (date)
  - `status` (text) - draft/approved
  - `total_pln` (decimal) - Загальна сума в злотих
  - `total_usd` (decimal) - Загальна сума в доларах
  - `approved_at` (timestamptz)
  - `approved_by` (uuid)
  - `created_at` (timestamptz)

  ### 4. receipt_items (Позиції прийомки)
  - `id` (uuid, primary key)
  - `receipt_id` (uuid) - Посилання на прийомку
  - `product_name` (text) - Назва товару
  - `quantity` (integer) - Кількість
  - `price_pln` (decimal) - Ціна за од. в злотих
  - `price_usd` (decimal) - Ціна за од. в доларах
  - `total_pln` (decimal) - Сума в злотих
  - `total_usd` (decimal) - Сума в доларах
  - `created_at` (timestamptz)

  ### 5. supplier_transactions (Транзакції з постачальником)
  - `id` (uuid, primary key)
  - `supplier_id` (uuid)
  - `receipt_id` (uuid) - Посилання на прийомку
  - `amount_pln` (decimal)
  - `amount_usd` (decimal)
  - `transaction_date` (timestamptz)
  - `notes` (text)
  - `created_at` (timestamptz)

  ## Безпека
  - RLS увімкнено на всіх таблицях
  - Базові політики для authenticated користувачів
*/

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  balance_pln decimal(12,2) DEFAULT 0,
  balance_usd decimal(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  status text DEFAULT 'draft',
  order_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- Active receipts table
CREATE TABLE IF NOT EXISTS active_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  receipt_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft',
  total_pln decimal(12,2) DEFAULT 0,
  total_usd decimal(12,2) DEFAULT 0,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE active_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view receipts"
  ON active_receipts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert receipts"
  ON active_receipts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update receipts"
  ON active_receipts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete receipts"
  ON active_receipts FOR DELETE
  TO authenticated
  USING (true);

-- Receipt items table
CREATE TABLE IF NOT EXISTS receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer DEFAULT 1,
  price_pln decimal(12,2) DEFAULT 0,
  price_usd decimal(12,2) DEFAULT 0,
  total_pln decimal(12,2) DEFAULT 0,
  total_usd decimal(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view receipt items"
  ON receipt_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert receipt items"
  ON receipt_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update receipt items"
  ON receipt_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete receipt items"
  ON receipt_items FOR DELETE
  TO authenticated
  USING (true);

-- Supplier transactions table
CREATE TABLE IF NOT EXISTS supplier_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE SET NULL,
  amount_pln decimal(12,2) DEFAULT 0,
  amount_usd decimal(12,2) DEFAULT 0,
  transaction_date timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions"
  ON supplier_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert transactions"
  ON supplier_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update transactions"
  ON supplier_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete transactions"
  ON supplier_transactions FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_receipts_order ON active_receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_transactions_supplier ON supplier_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt ON supplier_transactions(receipt_id);