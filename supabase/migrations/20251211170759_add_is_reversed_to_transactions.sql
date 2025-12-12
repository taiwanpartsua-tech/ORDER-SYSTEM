/*
  # Add is_reversed field to transactions table
  
  1. Changes
    - Add `is_reversed` boolean field to track reversed transactions
    - Add `reversed_at` timestamp to record when transaction was reversed
    - Default value is false for existing records
  
  2. Purpose
    - Instead of deleting reversed transactions, mark them as reversed
    - Keep history of all transactions including reversed ones
    - Reversed transactions will be displayed but not counted in balance
*/

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_reversed boolean DEFAULT false;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS reversed_at timestamptz;
