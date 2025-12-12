/*
  # Add detailed balance tracking fields
  
  1. Changes to `suppliers` table
    - Add `balance_parts_pln` - баланс за запчастини в PLN
    - Add `balance_delivery_pln` - баланс за доставку в PLN
    - Add `balance_receipt_pln` - баланс за прийом в PLN
    - Add `balance_cash_on_delivery_pln` - баланс за побранє в PLN
    - Add `balance_transport_usd` - баланс за транспорт в USD
    
  2. Changes to `supplier_transactions` table
    - Add `parts_cost_pln` - вартість запчастин в PLN
    - Add `delivery_cost_pln` - вартість доставки в PLN
    - Add `receipt_cost_pln` - вартість прийому в PLN
    - Add `cash_on_delivery_pln` - побранє в PLN
    - Add `transport_cost_usd` - вартість транспорту в USD
    
  3. Notes
    - All new fields default to 0
    - These fields allow detailed tracking of different cost components
*/

-- Add detailed balance fields to suppliers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_parts_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_parts_pln NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_delivery_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_delivery_pln NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_receipt_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_receipt_pln NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_cash_on_delivery_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_cash_on_delivery_pln NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'balance_transport_usd'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN balance_transport_usd NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;

-- Add detailed cost fields to supplier_transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_transactions' AND column_name = 'parts_cost_pln'
  ) THEN
    ALTER TABLE supplier_transactions ADD COLUMN parts_cost_pln NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_transactions' AND column_name = 'delivery_cost_pln'
  ) THEN
    ALTER TABLE supplier_transactions ADD COLUMN delivery_cost_pln NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_transactions' AND column_name = 'receipt_cost_pln'
  ) THEN
    ALTER TABLE supplier_transactions ADD COLUMN receipt_cost_pln NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_transactions' AND column_name = 'cash_on_delivery_pln'
  ) THEN
    ALTER TABLE supplier_transactions ADD COLUMN cash_on_delivery_pln NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_transactions' AND column_name = 'transport_cost_usd'
  ) THEN
    ALTER TABLE supplier_transactions ADD COLUMN transport_cost_usd NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;
