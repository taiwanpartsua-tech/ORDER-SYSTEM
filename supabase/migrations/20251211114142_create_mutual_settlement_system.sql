/*
  # Mutual Settlement System

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `transaction_type` (text) - 'debit' for charges from receipts, 'credit' for payments
      - `amount_pln` (numeric) - amount in PLN (прийом + побране from receipts)
      - `amount_usd` (numeric) - amount in USD (transport cost from receipts)
      - `description` (text) - description of transaction
      - `receipt_id` (uuid, nullable) - reference to active_receipts if this is a charge
      - `transaction_date` (date) - date of transaction
      - `created_at` (timestamptz) - when record was created
      - `created_by` (text) - who created the transaction
      
  2. Security
    - Enable RLS on `transactions` table
    - Add policies for anonymous access (matching the pattern of other tables)
    
  3. Notes
    - Debit transactions are automatically created when receipts are approved
    - Credit transactions are manually entered payments
    - Balance is calculated as: (sum of debits) - (sum of credits) for each currency
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  amount_pln numeric(15,2) DEFAULT 0,
  amount_usd numeric(15,2) DEFAULT 0,
  description text NOT NULL,
  receipt_id uuid REFERENCES active_receipts(id),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  created_by text DEFAULT 'system'
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select on transactions"
  ON transactions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on transactions"
  ON transactions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on transactions"
  ON transactions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on transactions"
  ON transactions
  FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt ON transactions(receipt_id);
