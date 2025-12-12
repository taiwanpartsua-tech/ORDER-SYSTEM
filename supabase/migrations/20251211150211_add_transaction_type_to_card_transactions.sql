/*
  # Add transaction type to card_transactions

  1. Changes
    - Add `transaction_type` column to `card_transactions` table
    - Type can be 'debit' (нарахування) or 'credit' (оплата)
    - Default is 'credit' for backward compatibility

  2. Purpose
    - Support both payment (credit) and charge (debit) transactions
    - Allow tracking increases and decreases in balance separately
*/

-- Add transaction_type column to card_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_transactions' AND column_name = 'transaction_type'
  ) THEN
    ALTER TABLE card_transactions ADD COLUMN transaction_type text DEFAULT 'credit' CHECK (transaction_type IN ('debit', 'credit'));
  END IF;
END $$;