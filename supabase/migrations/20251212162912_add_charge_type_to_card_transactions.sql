/*
  # Add 'charge' transaction type to card_transactions

  1. Changes
    - Update transaction_type constraint to include 'charge' type
    - 'charge' represents charges/debits from receipts
    - 'payment' represents payments/credits (reducing balance)
    - 'refund' represents refunds

  2. Purpose
    - Support tracking receipt charges in card balance
    - Keep consistent with payment and refund types
*/

-- Drop existing constraint
ALTER TABLE card_transactions DROP CONSTRAINT IF EXISTS card_transactions_transaction_type_check;

-- Add new constraint with 'charge' type
ALTER TABLE card_transactions 
ADD CONSTRAINT card_transactions_transaction_type_check 
CHECK (transaction_type IN ('payment', 'refund', 'charge'));