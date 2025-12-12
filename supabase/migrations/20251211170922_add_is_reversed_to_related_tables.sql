/*
  # Add is_reversed fields to card_transactions and supplier_transactions
  
  1. Changes
    - Add `is_reversed` boolean field to card_transactions
    - Add `reversed_at` timestamp to card_transactions
    - Add `is_reversed` boolean field to supplier_transactions
    - Add `reversed_at` timestamp to supplier_transactions
    
  2. Purpose
    - Track reversed status for all transaction types
    - Maintain history of reversed transactions
*/

ALTER TABLE card_transactions 
ADD COLUMN IF NOT EXISTS is_reversed boolean DEFAULT false;

ALTER TABLE card_transactions 
ADD COLUMN IF NOT EXISTS reversed_at timestamptz;

ALTER TABLE supplier_transactions 
ADD COLUMN IF NOT EXISTS is_reversed boolean DEFAULT false;

ALTER TABLE supplier_transactions 
ADD COLUMN IF NOT EXISTS reversed_at timestamptz;
