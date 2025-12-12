/*
  # Create Card Transactions Table

  1. New Tables
    - `card_transactions`
      - `id` (uuid, primary key)
      - `amount` (numeric) - Payment amount in PLN
      - `description` (text) - Payment description
      - `transaction_date` (date) - Date of payment
      - `created_at` (timestamptz) - Record creation timestamp
      - `created_by` (text) - User who created the transaction

  2. Security
    - Enable RLS on `card_transactions` table
    - Add policy for anyone to read card transactions
    - Add policy for anyone to insert card transactions

  3. Purpose
    - Separate card payment transactions from mutual settlement transactions
    - Keep independent history for card payments
*/

-- Create card_transactions table
CREATE TABLE IF NOT EXISTS card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(15,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  created_by text DEFAULT 'user'
);

-- Enable RLS
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read card transactions
CREATE POLICY "Anyone can read card transactions"
  ON card_transactions
  FOR SELECT
  USING (true);

-- Allow anyone to insert card transactions
CREATE POLICY "Anyone can insert card transactions"
  ON card_transactions
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to delete card transactions
CREATE POLICY "Anyone can delete card transactions"
  ON card_transactions
  FOR DELETE
  USING (true);