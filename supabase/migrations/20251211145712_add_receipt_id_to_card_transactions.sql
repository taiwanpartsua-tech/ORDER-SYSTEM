/*
  # Add receipt_id to card_transactions

  1. Changes
    - Add `receipt_id` column to `card_transactions` table
    - Add foreign key constraint to reference `active_receipts`
    - This allows linking card transactions to receipts for proper tracking and reversal

  2. Purpose
    - Enable tracking which transactions were created from settling receipts
    - Support reversal functionality that can update receipt status
*/

-- Add receipt_id column to card_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_transactions' AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE card_transactions ADD COLUMN receipt_id uuid REFERENCES active_receipts(id);
  END IF;
END $$;