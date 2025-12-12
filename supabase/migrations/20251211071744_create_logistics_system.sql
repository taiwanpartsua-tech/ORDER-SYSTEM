/*
  # Створення системи управління логістикою

  ## Опис
  Ця міграція створює повну структуру бази даних для системи управління замовленнями та постачальниками.

  ## Нові таблиці
  
  ### suppliers
  Таблиця для зберігання інформації про постачальників
  - `id` (uuid) - унікальний ідентифікатор
  - `name` (text) - назва постачальника
  - `balance` (decimal) - поточний баланс
  - `created_at` (timestamptz) - дата створення
  
  ### orders
  Таблиця для зберігання замовлень
  - `id` (uuid) - унікальний ідентифікатор
  - `supplier_id` (uuid) - посилання на постачальника
  - `order_number` (text) - номер замовлення (опціонально)
  - `recipient_phone` (text) - телефон одержувача
  - `cash_on_delivery` (decimal) - сума накладеного платежу
  - `payment_type` (text) - тип оплати: 'cash' або 'card'
  - `arttrans_id` (text) - ID відправлення в ArtTrans (опціонально)
  - `status` (text) - статус: 'pending', 'in_transit', 'delivered'
  - `created_at` (timestamptz) - дата створення
  - `delivered_at` (timestamptz) - дата доставки (опціонально)
  
  ### settings
  Таблиця для глобальних налаштувань
  - `key` (text) - ключ налаштування
  - `value` (text) - значення
  - `updated_at` (timestamptz) - дата оновлення
  
  ## Безпека
  - Увімкнено Row Level Security (RLS) для всіх таблиць
  - Додано політики для публічного доступу (anon) для операцій SELECT, INSERT, UPDATE, DELETE
  - Це дозволяє анонімним користувачам працювати з даними без авторизації
*/

-- Створення таблиці suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  balance decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Створення таблиці orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  order_number text,
  recipient_phone text NOT NULL,
  cash_on_delivery decimal(10,2) DEFAULT 0,
  payment_type text DEFAULT 'cash' CHECK (payment_type IN ('cash', 'card')),
  arttrans_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered')),
  created_at timestamptz DEFAULT now(),
  delivered_at timestamptz
);

-- Створення таблиці settings
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- Створення індексів для оптимізації запитів
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Увімкнення Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Політики для suppliers
CREATE POLICY "Allow public read access to suppliers"
  ON suppliers FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to suppliers"
  ON suppliers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to suppliers"
  ON suppliers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from suppliers"
  ON suppliers FOR DELETE
  TO anon
  USING (true);

-- Політики для orders
CREATE POLICY "Allow public read access to orders"
  ON orders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to orders"
  ON orders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from orders"
  ON orders FOR DELETE
  TO anon
  USING (true);

-- Політики для settings
CREATE POLICY "Allow public read access to settings"
  ON settings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to settings"
  ON settings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to settings"
  ON settings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from settings"
  ON settings FOR DELETE
  TO anon
  USING (true);