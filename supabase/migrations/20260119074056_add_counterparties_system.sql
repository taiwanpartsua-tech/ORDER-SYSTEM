/*
  # Add Counterparties (Контрагенти) System

  ## New Tables
    - `counterparties` (контрагенти)
      - `id` (uuid, primary key)
      - `name` (text, unique per project, required) - Назва контрагента
      - `code` (text, unique per project) - Код контрагента
      - `is_active` (boolean, default true)
      - `project_id` (uuid, foreign key to projects)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  ## Changes to Existing Tables
    - Add `counterparty_id` to:
      - `orders` (nullable for existing orders, default ROMAN for new ones)
      - `active_receipts`
      - `receipts`
      - `accepted_orders`
      - `returns`
      - `suppliers`
      - `transactions`
      - `card_transactions`

  ## Default Data
    - Create default counterparty "ROMAN" for each project

  ## Security
    - Enable RLS on counterparties table
    - Add policies for authenticated users
*/

-- Create counterparties table
CREATE TABLE IF NOT EXISTS counterparties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  is_active boolean DEFAULT true,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, project_id),
  UNIQUE(code, project_id)
);

-- Enable RLS
ALTER TABLE counterparties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for counterparties
CREATE POLICY "Users can view counterparties in their projects"
  ON counterparties FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM user_project_access WHERE user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can insert counterparties"
  ON counterparties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_project_access upa
      JOIN user_profiles up ON up.id = upa.user_id
      WHERE upa.user_id = auth.uid() 
      AND upa.project_id = counterparties.project_id
      AND (up.role IN ('admin', 'super_admin') OR upa.role = 'admin')
    )
  );

CREATE POLICY "Admins can update counterparties"
  ON counterparties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access upa
      JOIN user_profiles up ON up.id = upa.user_id
      WHERE upa.user_id = auth.uid() 
      AND upa.project_id = counterparties.project_id
      AND (up.role IN ('admin', 'super_admin') OR upa.role = 'admin')
    )
  );

CREATE POLICY "Super admins can delete counterparties"
  ON counterparties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Create default ROMAN counterparty for each existing project
INSERT INTO counterparties (name, code, project_id)
SELECT 'ROMAN', 'ROMAN', id FROM projects
ON CONFLICT (name, project_id) DO NOTHING;

-- Add counterparty_id to orders (nullable for existing orders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN counterparty_id uuid REFERENCES counterparties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_counterparty_id ON orders(counterparty_id);
  END IF;
END $$;

-- Add counterparty_id to active_receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_receipts' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN counterparty_id uuid REFERENCES counterparties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_active_receipts_counterparty_id ON active_receipts(counterparty_id);
  END IF;
END $$;

-- Add counterparty_id to receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE receipts ADD COLUMN counterparty_id uuid REFERENCES counterparties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_receipts_counterparty_id ON receipts(counterparty_id);
  END IF;
END $$;

-- Add counterparty_id to accepted_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accepted_orders' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE accepted_orders ADD COLUMN counterparty_id uuid REFERENCES counterparties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_accepted_orders_counterparty_id ON accepted_orders(counterparty_id);
  END IF;
END $$;

-- Add counterparty_id to returns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE returns ADD COLUMN counterparty_id uuid REFERENCES counterparties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_returns_counterparty_id ON returns(counterparty_id);
  END IF;
END $$;

-- Add counterparty_id to suppliers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN counterparty_id uuid REFERENCES counterparties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_suppliers_counterparty_id ON suppliers(counterparty_id);
  END IF;
END $$;

-- Add counterparty_id to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN counterparty_id uuid REFERENCES counterparties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_transactions_counterparty_id ON transactions(counterparty_id);
  END IF;
END $$;

-- Add counterparty_id to card_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_transactions' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE card_transactions ADD COLUMN counterparty_id uuid REFERENCES counterparties(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_card_transactions_counterparty_id ON card_transactions(counterparty_id);
  END IF;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to counterparties
DROP TRIGGER IF EXISTS update_counterparties_updated_at ON counterparties;
CREATE TRIGGER update_counterparties_updated_at
  BEFORE UPDATE ON counterparties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();