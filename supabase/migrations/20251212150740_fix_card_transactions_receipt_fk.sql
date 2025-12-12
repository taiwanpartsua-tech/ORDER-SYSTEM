/*
  # Fix card_transactions foreign key to active_receipts

  1. Changes
    - Drop existing foreign key constraint from card_transactions.receipt_id to receipts
    - Add new foreign key constraint from card_transactions.receipt_id to active_receipts
  
  2. Purpose
    - Fix foreign key reference to point to the correct table (active_receipts)
    - Allow card transactions to link to active receipts properly
*/

-- Drop the incorrect foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'card_transactions_receipt_id_fkey'
    AND table_name = 'card_transactions'
  ) THEN
    ALTER TABLE card_transactions DROP CONSTRAINT card_transactions_receipt_id_fkey;
  END IF;
END $$;

-- Add the correct foreign key constraint to active_receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'card_transactions_receipt_id_active_fkey'
    AND table_name = 'card_transactions'
  ) THEN
    ALTER TABLE card_transactions 
    ADD CONSTRAINT card_transactions_receipt_id_active_fkey 
    FOREIGN KEY (receipt_id) REFERENCES active_receipts(id) ON DELETE SET NULL;
  END IF;
END $$;