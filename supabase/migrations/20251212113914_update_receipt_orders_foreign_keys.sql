/*
  # Оновлення зовнішніх ключів для таблиці receipt_orders

  1. Зміни
    - Перестворюємо зовнішній ключ receipt_id щоб вказувати на active_receipts
    - Створюємо таблицю receipt_order_snapshots якщо вона не існує

  2. Безпека
    - Зберігаємо існуючі політики RLS
*/

-- Видаляємо старий зовнішній ключ якщо він існує і вказує на іншу таблицю
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'receipt_orders_receipt_id_fkey'
    AND table_name = 'receipt_orders'
  ) THEN
    ALTER TABLE receipt_orders DROP CONSTRAINT receipt_orders_receipt_id_fkey;
  END IF;
END $$;

-- Додаємо правильний зовнішній ключ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'receipt_orders_receipt_id_fkey'
    AND table_name = 'receipt_orders'
  ) THEN
    ALTER TABLE receipt_orders 
    ADD CONSTRAINT receipt_orders_receipt_id_fkey 
    FOREIGN KEY (receipt_id) REFERENCES active_receipts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Створюємо таблицю receipt_order_snapshots якщо вона не існує
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

-- Увімкнути RLS на receipt_order_snapshots
ALTER TABLE receipt_order_snapshots ENABLE ROW LEVEL SECURITY;

-- Політики для публічного доступу
DROP POLICY IF EXISTS "Public access to receipt_order_snapshots select" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Public access to receipt_order_snapshots insert" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Public access to receipt_order_snapshots update" ON receipt_order_snapshots;
DROP POLICY IF EXISTS "Public access to receipt_order_snapshots delete" ON receipt_order_snapshots;

CREATE POLICY "Public access to receipt_order_snapshots select"
  ON receipt_order_snapshots FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public access to receipt_order_snapshots insert"
  ON receipt_order_snapshots FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public access to receipt_order_snapshots update"
  ON receipt_order_snapshots FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to receipt_order_snapshots delete"
  ON receipt_order_snapshots FOR DELETE
  TO anon, authenticated
  USING (true);