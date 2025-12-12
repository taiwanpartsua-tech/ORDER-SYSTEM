/*
  # Створення повної системи логістики та управління замовленнями

  ## Опис
  Ця міграція створює комплексну систему для управління логістикою, замовленнями,
  постачальниками, квитанціями, взаєморозрахунками та фінансовими операціями.

  ## Нові таблиці

  ### 1. suppliers (Постачальники)
  - `id` (uuid, primary key) - унікальний ідентифікатор
  - `name` (text) - назва постачальника
  - `total_orders` (integer) - загальна кількість замовлень
  - `completed_orders` (integer) - кількість завершених замовлень
  - `balance` (numeric) - поточний баланс
  - `total_debt` (numeric) - загальна заборгованість
  - `cash_balance` (numeric) - готівковий баланс
  - `card_balance` (numeric) - картковий баланс
  - `pending_receipt_balance` (numeric) - баланс очікуючих квитанцій
  - `created_at` (timestamptz) - дата створення

  ### 2. orders (Замовлення)
  - `id` (uuid, primary key) - унікальний ідентифікатор
  - `supplier_id` (uuid) - посилання на постачальника
  - `order_number` (text) - номер замовлення
  - `client_name` (text) - ім'я клієнта
  - `phone` (text) - телефон
  - `city` (text) - місто
  - `warehouse` (text) - склад
  - `payment_type` (text) - тип оплати (cash/card)
  - `cash_on_delivery` (numeric) - накладений платіж
  - `status` (text) - статус замовлення
  - `track_number` (text) - трек-номер
  - `notes` (text) - примітки
  - `archived` (boolean) - чи архівовано
  - `created_at` (timestamptz) - дата створення

  ### 3. receipts (Квитанції/Накладні)
  - `id` (uuid, primary key) - унікальний ідентифікатор
  - `supplier_id` (uuid) - посилання на постачальника
  - `receipt_number` (text) - номер квитанції
  - `date` (date) - дата квитанції
  - `total_amount` (numeric) - загальна сума
  - `cash_amount` (numeric) - сума готівкою
  - `card_amount` (numeric) - сума карткою
  - `status` (text) - статус (pending/confirmed/cancelled)
  - `settlement_status` (text) - статус розрахунків
  - `snapshot_data` (jsonb) - знімок даних для історії
  - `is_reversed` (boolean) - чи скасовано
  - `created_at` (timestamptz) - дата створення

  ### 4. receipt_orders (Замовлення в квитанції)
  - `id` (uuid, primary key) - унікальний ідентифікатор
  - `receipt_id` (uuid) - посилання на квитанцію
  - `order_id` (uuid) - посилання на замовлення
  - `amount` (numeric) - сума замовлення
  - `created_at` (timestamptz) - дата створення

  ### 5. transactions (Фінансові транзакції)
  - `id` (uuid, primary key) - унікальний ідентифікатор
  - `supplier_id` (uuid) - посилання на постачальника
  - `type` (text) - тип транзакції
  - `amount` (numeric) - сума
  - `description` (text) - опис
  - `balance_before` (numeric) - баланс до
  - `balance_after` (numeric) - баланс після
  - `cash_balance_before` (numeric) - готівковий баланс до
  - `cash_balance_after` (numeric) - готівковий баланс після
  - `card_balance_before` (numeric) - картковий баланс до
  - `card_balance_after` (numeric) - картковий баланс після
  - `is_reversed` (boolean) - чи скасовано
  - `created_at` (timestamptz) - дата створення

  ### 6. mutual_settlements (Взаєморозрахунки)
  - `id` (uuid, primary key) - унікальний ідентифікатор
  - `supplier_id` (uuid) - посилання на постачальника
  - `receipt_id` (uuid) - посилання на квитанцію
  - `settlement_date` (date) - дата розрахунків
  - `total_amount` (numeric) - загальна сума
  - `cash_paid` (numeric) - оплачено готівкою
  - `card_paid` (numeric) - оплачено карткою
  - `remaining_balance` (numeric) - залишок балансу
  - `status` (text) - статус
  - `notes` (text) - примітки
  - `is_reversed` (boolean) - чи скасовано
  - `created_at` (timestamptz) - дата створення

  ### 7. card_transactions (Карткові транзакції)
  - `id` (uuid, primary key) - унікальний ідентифікатор
  - `supplier_id` (uuid) - посилання на постачальника
  - `receipt_id` (uuid) - посилання на квитанцію (опціонально)
  - `transaction_type` (text) - тип транзакції (payment/refund)
  - `amount` (numeric) - сума
  - `card_last4` (text) - останні 4 цифри картки
  - `transaction_date` (date) - дата транзакції
  - `status` (text) - статус
  - `description` (text) - опис
  - `is_reversed` (boolean) - чи скасовано
  - `created_at` (timestamptz) - дата створення

  ### 8. returns (Повернення)
  - `id` (uuid, primary key) - унікальний ідентифікатор
  - `supplier_id` (uuid) - посилання на постачальника
  - `order_id` (uuid) - посилання на замовлення
  - `return_date` (date) - дата повернення
  - `reason` (text) - причина повернення
  - `amount` (numeric) - сума повернення
  - `refund_amount` (numeric) - сума відшкодування
  - `refund_status` (text) - статус відшкодування
  - `manager_name` (text) - ім'я менеджера
  - `status` (text) - статус
  - `notes` (text) - примітки
  - `is_reversed` (boolean) - чи скасовано
  - `created_at` (timestamptz) - дата створення

  ## Безпека
  - Увімкнено Row Level Security (RLS) для всіх таблиць
  - Дозволено анонімний доступ для читання та запису (для MVP)
  - В продакшені потрібно змінити політики на автентифіковані

  ## Індекси
  - Створено індекси для зовнішніх ключів та часто використовуваних полів
*/

-- Створення таблиці постачальників
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  total_orders integer DEFAULT 0,
  completed_orders integer DEFAULT 0,
  balance numeric(20,2) DEFAULT 0,
  total_debt numeric(20,2) DEFAULT 0,
  cash_balance numeric(20,2) DEFAULT 0,
  card_balance numeric(20,2) DEFAULT 0,
  pending_receipt_balance numeric(20,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Створення таблиці замовлень
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  order_number text,
  client_name text,
  phone text,
  city text,
  warehouse text,
  payment_type text CHECK (payment_type IN ('cash', 'card')),
  cash_on_delivery numeric(20,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  track_number text,
  notes text,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Створення таблиці квитанцій
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  date date NOT NULL,
  total_amount numeric(20,2) DEFAULT 0,
  cash_amount numeric(20,2) DEFAULT 0,
  card_amount numeric(20,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  settlement_status text DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'partial', 'completed')),
  snapshot_data jsonb,
  is_reversed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Створення таблиці замовлень в квитанціях
CREATE TABLE IF NOT EXISTS receipt_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES receipts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(20,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(receipt_id, order_id)
);

-- Створення таблиці транзакцій
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric(20,2) NOT NULL,
  description text,
  balance_before numeric(20,2) DEFAULT 0,
  balance_after numeric(20,2) DEFAULT 0,
  cash_balance_before numeric(20,2) DEFAULT 0,
  cash_balance_after numeric(20,2) DEFAULT 0,
  card_balance_before numeric(20,2) DEFAULT 0,
  card_balance_after numeric(20,2) DEFAULT 0,
  is_reversed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Створення таблиці взаєморозрахунків
CREATE TABLE IF NOT EXISTS mutual_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  receipt_id uuid REFERENCES receipts(id) ON DELETE SET NULL,
  settlement_date date NOT NULL,
  total_amount numeric(20,2) NOT NULL,
  cash_paid numeric(20,2) DEFAULT 0,
  card_paid numeric(20,2) DEFAULT 0,
  remaining_balance numeric(20,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  is_reversed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Створення таблиці карткових транзакцій
CREATE TABLE IF NOT EXISTS card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  receipt_id uuid REFERENCES receipts(id) ON DELETE SET NULL,
  transaction_type text DEFAULT 'payment' CHECK (transaction_type IN ('payment', 'refund')),
  amount numeric(20,2) NOT NULL,
  card_last4 text,
  transaction_date date NOT NULL,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description text,
  is_reversed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Створення таблиці повернень
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  return_date date NOT NULL,
  reason text NOT NULL,
  amount numeric(20,2) NOT NULL,
  refund_amount numeric(20,2) DEFAULT 0,
  refund_status text DEFAULT 'pending' CHECK (refund_status IN ('pending', 'approved', 'rejected', 'completed')),
  manager_name text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes text,
  is_reversed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Створення індексів
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(archived);
CREATE INDEX IF NOT EXISTS idx_receipts_supplier_id ON receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipt_orders_receipt_id ON receipt_orders(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_orders_order_id ON receipt_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_mutual_settlements_supplier_id ON mutual_settlements(supplier_id);
CREATE INDEX IF NOT EXISTS idx_mutual_settlements_receipt_id ON mutual_settlements(receipt_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_supplier_id ON card_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_receipt_id ON card_transactions(receipt_id);
CREATE INDEX IF NOT EXISTS idx_returns_supplier_id ON returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);

-- Увімкнення Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutual_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Політики RLS для анонімного доступу (для MVP)
-- ВАЖЛИВО: В продакшені замініть 'anon' на 'authenticated' та додайте перевірки власності

-- Suppliers policies
CREATE POLICY "Allow anonymous read access to suppliers"
  ON suppliers FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to suppliers"
  ON suppliers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to suppliers"
  ON suppliers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from suppliers"
  ON suppliers FOR DELETE
  TO anon
  USING (true);

-- Orders policies
CREATE POLICY "Allow anonymous read access to orders"
  ON orders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to orders"
  ON orders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from orders"
  ON orders FOR DELETE
  TO anon
  USING (true);

-- Receipts policies
CREATE POLICY "Allow anonymous read access to receipts"
  ON receipts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to receipts"
  ON receipts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to receipts"
  ON receipts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from receipts"
  ON receipts FOR DELETE
  TO anon
  USING (true);

-- Receipt orders policies
CREATE POLICY "Allow anonymous read access to receipt_orders"
  ON receipt_orders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to receipt_orders"
  ON receipt_orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to receipt_orders"
  ON receipt_orders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from receipt_orders"
  ON receipt_orders FOR DELETE
  TO anon
  USING (true);

-- Transactions policies
CREATE POLICY "Allow anonymous read access to transactions"
  ON transactions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to transactions"
  ON transactions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to transactions"
  ON transactions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from transactions"
  ON transactions FOR DELETE
  TO anon
  USING (true);

-- Mutual settlements policies
CREATE POLICY "Allow anonymous read access to mutual_settlements"
  ON mutual_settlements FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to mutual_settlements"
  ON mutual_settlements FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to mutual_settlements"
  ON mutual_settlements FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from mutual_settlements"
  ON mutual_settlements FOR DELETE
  TO anon
  USING (true);

-- Card transactions policies
CREATE POLICY "Allow anonymous read access to card_transactions"
  ON card_transactions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to card_transactions"
  ON card_transactions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to card_transactions"
  ON card_transactions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from card_transactions"
  ON card_transactions FOR DELETE
  TO anon
  USING (true);

-- Returns policies
CREATE POLICY "Allow anonymous read access to returns"
  ON returns FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to returns"
  ON returns FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to returns"
  ON returns FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from returns"
  ON returns FOR DELETE
  TO anon
  USING (true);