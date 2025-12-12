/*
  # Створення таблиць для прийомки товару та балансів

  ## Опис
  Ця міграція створює таблиці для роботи з прийомкою товару та управління балансами постачальників.

  ## Нові таблиці
  
  ### active_receipts
  Таблиця для активних прийомок товару
  - `id` (uuid) - унікальний ідентифікатор
  - `order_id` (uuid) - посилання на замовлення
  - `receipt_number` (text) - номер прийомки
  - `receipt_date` (date) - дата прийомки
  - `status` (text) - статус: 'draft' або 'approved'
  - `total_pln` (decimal) - загальна сума в злотих
  - `total_usd` (decimal) - загальна сума в доларах
  - `approved_at` (timestamptz) - дата затвердження
  - `created_at` (timestamptz) - дата створення
  
  ### receipt_items
  Таблиця для позицій в прийомці
  - `id` (uuid) - унікальний ідентифікатор
  - `receipt_id` (uuid) - посилання на прийомку
  - `product_name` (text) - назва товару
  - `quantity` (integer) - кількість
  - `price_pln` (decimal) - ціна за одиницю в злотих
  - `price_usd` (decimal) - ціна за одиницю в доларах
  - `total_pln` (decimal) - загальна сума в злотих
  - `total_usd` (decimal) - загальна сума в доларах
  - `created_at` (timestamptz) - дата створення
  
  ### supplier_transactions
  Таблиця для транзакцій з постачальниками
  - `id` (uuid) - унікальний ідентифікатор
  - `supplier_id` (uuid) - посилання на постачальника
  - `receipt_id` (uuid) - посилання на прийомку
  - `amount_pln` (decimal) - сума в злотих
  - `amount_usd` (decimal) - сума в доларах
  - `notes` (text) - примітки
  - `created_at` (timestamptz) - дата створення
  
  ## Зміни в існуючих таблицях
  
  ### suppliers
  Додавання полів для окремого обліку балансів у різних валютах:
  - `balance_pln` (decimal) - баланс в злотих
  - `balance_usd` (decimal) - баланс в доларах
  
  ### orders
  Зробити поле recipient_phone опціональним
  
  ## Безпека
  - Увімкнено Row Level Security (RLS) для всіх нових таблиць
  - Додано політики для публічного доступу (anon)
*/

-- Додавання полів балансу до таблиці suppliers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'balance_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_pln decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'balance_usd'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_usd decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Зробити recipient_phone опціональним
ALTER TABLE orders ALTER COLUMN recipient_phone DROP NOT NULL;

-- Створення таблиці active_receipts
CREATE TABLE IF NOT EXISTS active_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  receipt_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  total_pln decimal(10,2) DEFAULT 0,
  total_usd decimal(10,2) DEFAULT 0,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Створення таблиці receipt_items
CREATE TABLE IF NOT EXISTS receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer DEFAULT 1,
  price_pln decimal(10,2) DEFAULT 0,
  price_usd decimal(10,2) DEFAULT 0,
  total_pln decimal(10,2) DEFAULT 0,
  total_usd decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Створення таблиці supplier_transactions
CREATE TABLE IF NOT EXISTS supplier_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE SET NULL,
  amount_pln decimal(10,2) DEFAULT 0,
  amount_usd decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Створення індексів
CREATE INDEX IF NOT EXISTS idx_active_receipts_order_id ON active_receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_active_receipts_status ON active_receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier_id ON supplier_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_receipt_id ON supplier_transactions(receipt_id);

-- Увімкнення Row Level Security
ALTER TABLE active_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_transactions ENABLE ROW LEVEL SECURITY;

-- Політики для active_receipts
CREATE POLICY "Allow public read access to active_receipts"
  ON active_receipts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to active_receipts"
  ON active_receipts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to active_receipts"
  ON active_receipts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from active_receipts"
  ON active_receipts FOR DELETE
  TO anon
  USING (true);

-- Політики для receipt_items
CREATE POLICY "Allow public read access to receipt_items"
  ON receipt_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to receipt_items"
  ON receipt_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to receipt_items"
  ON receipt_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from receipt_items"
  ON receipt_items FOR DELETE
  TO anon
  USING (true);

-- Політики для supplier_transactions
CREATE POLICY "Allow public read access to supplier_transactions"
  ON supplier_transactions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to supplier_transactions"
  ON supplier_transactions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to supplier_transactions"
  ON supplier_transactions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from supplier_transactions"
  ON supplier_transactions FOR DELETE
  TO anon
  USING (true);