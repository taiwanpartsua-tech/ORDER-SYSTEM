/*
  # Розширення системи прийомок для детального обліку балансів

  ## Опис
  Ця міграція розширює систему прийомок для окремого відстеження балансів 
  за категоріями (запчастини, доставка, прийом, побрання, перевезення).

  ## Зміни

  ### 1. Таблиця active_receipts
  Додано поля для окремого обліку сум:
  - `parts_cost_pln` (decimal) - вартість запчастин в злотих
  - `delivery_cost_pln` (decimal) - вартість доставки в злотих  
  - `receipt_cost_pln` (decimal) - вартість прийому в злотих
  - `cash_on_delivery_pln` (decimal) - побрання в злотих
  - `transport_cost_usd` (decimal) - перевезення в доларах
  - Видалено прив'язку до одного замовлення (order_id)

  ### 2. Таблиця receipt_orders
  Нова таблиця для зв'язку багато-до-багатьох між прийомками та замовленнями:
  - `id` (uuid) - унікальний ідентифікатор
  - `receipt_id` (uuid) - посилання на прийомку
  - `order_id` (uuid) - посилання на замовлення
  - `created_at` (timestamptz) - дата створення

  ### 3. Таблиця suppliers
  Додано окремі баланси за категоріями:
  - `balance_parts_pln` (decimal) - баланс запчастин
  - `balance_delivery_pln` (decimal) - баланс доставки
  - `balance_receipt_pln` (decimal) - баланс прийому
  - `balance_cash_on_delivery_pln` (decimal) - баланс побрання
  - `balance_transport_usd` (decimal) - баланс перевезення в доларах

  ### 4. Таблиця supplier_transactions
  Додано поля для окремого обліку транзакцій:
  - `parts_cost_pln` (decimal) - запчастини
  - `delivery_cost_pln` (decimal) - доставка
  - `receipt_cost_pln` (decimal) - прийом
  - `cash_on_delivery_pln` (decimal) - побрання
  - `transport_cost_usd` (decimal) - перевезення

  ## Безпека
  - Увімкнено Row Level Security (RLS) для нової таблиці
  - Додано політики для публічного доступу (anon)
*/

-- Додавання полів до active_receipts
ALTER TABLE active_receipts DROP COLUMN IF EXISTS order_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_receipts' AND column_name = 'parts_cost_pln'
  ) THEN
    ALTER TABLE active_receipts 
      ADD COLUMN parts_cost_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN delivery_cost_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN receipt_cost_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN cash_on_delivery_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN transport_cost_usd decimal(15,2) DEFAULT 0;
  END IF;
END $$;

-- Створення таблиці receipt_orders для зв'язку багато-до-багатьох
CREATE TABLE IF NOT EXISTS receipt_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES active_receipts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(receipt_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_receipt_orders_receipt_id ON receipt_orders(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_orders_order_id ON receipt_orders(order_id);

-- Увімкнення Row Level Security для receipt_orders
ALTER TABLE receipt_orders ENABLE ROW LEVEL SECURITY;

-- Політики для receipt_orders
CREATE POLICY "Allow public read access to receipt_orders"
  ON receipt_orders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to receipt_orders"
  ON receipt_orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public delete from receipt_orders"
  ON receipt_orders FOR DELETE
  TO anon
  USING (true);

-- Додавання окремих балансів до suppliers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'balance_parts_pln'
  ) THEN
    ALTER TABLE suppliers 
      ADD COLUMN balance_parts_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN balance_delivery_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN balance_receipt_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN balance_cash_on_delivery_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN balance_transport_usd decimal(15,2) DEFAULT 0;
  END IF;
END $$;

-- Додавання окремих сум до supplier_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_transactions' AND column_name = 'parts_cost_pln'
  ) THEN
    ALTER TABLE supplier_transactions 
      ADD COLUMN parts_cost_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN delivery_cost_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN receipt_cost_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN cash_on_delivery_pln decimal(15,2) DEFAULT 0,
      ADD COLUMN transport_cost_usd decimal(15,2) DEFAULT 0;
  END IF;
END $$;