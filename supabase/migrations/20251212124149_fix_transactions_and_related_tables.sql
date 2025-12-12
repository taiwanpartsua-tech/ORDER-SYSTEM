/*
  # Виправлення таблиць transactions та card_transactions

  ## Зміни:
  
  1. Таблиця transactions:
     - Видалено обов'язкове поле `type` (залишаємо тільки `transaction_type`)
     - Видалено застарілі поля `supplier_id`, `amount`, `balance_*`, `cash_balance_*`, `card_balance_*`
     - Залишаємо тільки поля, які використовуються в коді
  
  2. Таблиця card_transactions:
     - Видалено поле `supplier_id`, оскільки воно не використовується
  
  3. Таблиця managers:
     - Створено таблицю managers, яка використовується в коді
  
  ## Безпека:
     - Збережено всі RLS політики
*/

-- Створення таблиці managers
CREATE TABLE IF NOT EXISTS managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on managers" ON managers;
CREATE POLICY "Allow all operations on managers"
  ON managers
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Видалення застарілих полів з transactions
DO $$ 
BEGIN
  -- Видалити обов'язкове поле type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'type'
  ) THEN
    ALTER TABLE transactions DROP COLUMN type;
  END IF;

  -- Видалити застарілі поля
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE transactions DROP COLUMN supplier_id CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'amount'
  ) THEN
    ALTER TABLE transactions DROP COLUMN amount;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'balance_before'
  ) THEN
    ALTER TABLE transactions DROP COLUMN balance_before;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'balance_after'
  ) THEN
    ALTER TABLE transactions DROP COLUMN balance_after;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'cash_balance_before'
  ) THEN
    ALTER TABLE transactions DROP COLUMN cash_balance_before;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'cash_balance_after'
  ) THEN
    ALTER TABLE transactions DROP COLUMN cash_balance_after;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'card_balance_before'
  ) THEN
    ALTER TABLE transactions DROP COLUMN card_balance_before;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'card_balance_after'
  ) THEN
    ALTER TABLE transactions DROP COLUMN card_balance_after;
  END IF;
END $$;

-- Видалення застарілих полів з card_transactions
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_transactions' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE card_transactions DROP COLUMN supplier_id CASCADE;
  END IF;
END $$;