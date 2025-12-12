/*
  # Add Detailed Balance Fields to Transactions

  1. Changes
    - Add `cash_on_delivery_pln` field to track "прийом і побраня" amounts
    - Add `transport_cost_usd` field to track "перевезення" amounts
    - Add `parts_delivery_pln` field to track "запчастини + доставка" amounts
  
  2. Purpose
    - Enable separate tracking of three balance types:
      1. Receipt and cash on delivery (PLN)
      2. Transport costs (USD)
      3. Parts and delivery (PLN)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'cash_on_delivery_pln'
  ) THEN
    ALTER TABLE transactions ADD COLUMN cash_on_delivery_pln numeric(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transport_cost_usd'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transport_cost_usd numeric(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'parts_delivery_pln'
  ) THEN
    ALTER TABLE transactions ADD COLUMN parts_delivery_pln numeric(15,2) DEFAULT 0;
  END IF;
END $$;