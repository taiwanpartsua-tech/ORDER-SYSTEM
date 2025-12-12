/*
  # Додавання детальних полів балансу до suppliers

  ## Зміни:
  
  1. Додано детальні поля балансу:
     - balance_pln - загальний баланс в злотих
     - balance_usd - загальний баланс в доларах  
     - balance_parts_pln - баланс за запчастини
     - balance_delivery_pln - баланс за доставку
     - balance_receipt_pln - баланс за прийом
     - balance_cash_on_delivery_pln - баланс за побраню
     - balance_transport_usd - баланс за перевезення
*/

DO $$ 
BEGIN
  -- Додати balance_pln якщо не існує
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_pln numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати balance_usd якщо не існує
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_usd'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_usd numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати balance_parts_pln якщо не існує
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_parts_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_parts_pln numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати balance_delivery_pln якщо не існує
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_delivery_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_delivery_pln numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати balance_receipt_pln якщо не існує
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_receipt_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_receipt_pln numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати balance_cash_on_delivery_pln якщо не існує
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_cash_on_delivery_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_cash_on_delivery_pln numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати balance_transport_usd якщо не існує
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_transport_usd'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_transport_usd numeric(15,2) DEFAULT 0;
  END IF;
END $$;