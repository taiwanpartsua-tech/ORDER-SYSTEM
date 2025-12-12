/*
  # Додавання полів для взаєморозрахунків до таблиці transactions

  1. Зміни
    - Додано поле `transaction_type` (замість type) - тип транзакції (debit/credit)
    - Додано поле `amount_pln` - сума в злотих
    - Додано поле `amount_usd` - сума в доларах
    - Додано поле `cash_on_delivery_pln` - побране в злотих
    - Додано поле `transport_cost_usd` - вартість транспорту в доларах
    - Додано поле `parts_delivery_pln` - запчастини + доставка в злотих
    - Додано поле `receipt_id` - посилання на прийомку
    - Додано поле `transaction_date` - дата транзакції
    - Додано поле `created_by` - хто створив транзакцію
    - Додано поле `reversed_at` - дата сторнування

  2. Безпека
    - Зберігаємо існуючі політики RLS
*/

-- Додаємо нові поля до таблиці transactions
DO $$
BEGIN
  -- transaction_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'transaction_type'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_type text CHECK (transaction_type IN ('debit', 'credit'));
  END IF;

  -- amount_pln
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'amount_pln'
  ) THEN
    ALTER TABLE transactions ADD COLUMN amount_pln numeric(15,2) DEFAULT 0;
  END IF;

  -- amount_usd
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'amount_usd'
  ) THEN
    ALTER TABLE transactions ADD COLUMN amount_usd numeric(15,2) DEFAULT 0;
  END IF;

  -- cash_on_delivery_pln
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'cash_on_delivery_pln'
  ) THEN
    ALTER TABLE transactions ADD COLUMN cash_on_delivery_pln numeric(15,2) DEFAULT 0;
  END IF;

  -- transport_cost_usd
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'transport_cost_usd'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transport_cost_usd numeric(15,2) DEFAULT 0;
  END IF;

  -- parts_delivery_pln
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'parts_delivery_pln'
  ) THEN
    ALTER TABLE transactions ADD COLUMN parts_delivery_pln numeric(15,2) DEFAULT 0;
  END IF;

  -- receipt_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN receipt_id uuid REFERENCES active_receipts(id) ON DELETE SET NULL;
  END IF;

  -- transaction_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'transaction_date'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_date date DEFAULT CURRENT_DATE;
  END IF;

  -- created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE transactions ADD COLUMN created_by text DEFAULT 'system';
  END IF;

  -- reversed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'reversed_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN reversed_at timestamptz;
  END IF;
END $$;