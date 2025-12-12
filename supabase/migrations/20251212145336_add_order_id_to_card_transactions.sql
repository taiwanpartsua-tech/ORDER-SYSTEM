/*
  # Add order_id to card_transactions table
  
  1. Changes
    - Add `order_id` column to `card_transactions` table with foreign key reference to orders
    - This allows tracking which order a card transaction is related to
    - Enables proper reversal of order-related transactions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_transactions' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE card_transactions ADD COLUMN order_id uuid REFERENCES orders(id);
  END IF;
END $$;
