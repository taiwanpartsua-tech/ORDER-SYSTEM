/*
  # Add project_id to all main tables

  1. Changes
    - Add `project_id` column to all main business tables
    - Set default project_id to existing default project
    - Update RLS policies to filter by project_id
    - Add indexes for project_id filtering

  2. Tables to update
    - suppliers
    - orders
    - returns
    - active_receipts
    - transactions
    - card_transactions
    - tariff_settings
    - audit_logs
    - receipt_field_changes
    - accepted_orders
    - order_photos
*/

-- Get the default project ID
DO $$
DECLARE
  default_project_id uuid;
BEGIN
  SELECT id INTO default_project_id 
  FROM projects 
  WHERE name = 'ArtTrans Logistics' 
  LIMIT 1;

  -- Add project_id to suppliers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE suppliers SET project_id = default_project_id WHERE project_id IS NULL;
    ALTER TABLE suppliers ALTER COLUMN project_id SET NOT NULL;
    CREATE INDEX idx_suppliers_project_id ON suppliers(project_id);
  END IF;

  -- Add project_id to orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE orders SET project_id = default_project_id WHERE project_id IS NULL;
    ALTER TABLE orders ALTER COLUMN project_id SET NOT NULL;
    CREATE INDEX idx_orders_project_id ON orders(project_id);
  END IF;

  -- Add project_id to returns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE returns ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE returns SET project_id = default_project_id WHERE project_id IS NULL;
    ALTER TABLE returns ALTER COLUMN project_id SET NOT NULL;
    CREATE INDEX idx_returns_project_id ON returns(project_id);
  END IF;

  -- Add project_id to active_receipts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE active_receipts SET project_id = default_project_id WHERE project_id IS NULL;
    ALTER TABLE active_receipts ALTER COLUMN project_id SET NOT NULL;
    CREATE INDEX idx_active_receipts_project_id ON active_receipts(project_id);
  END IF;

  -- Add project_id to transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE transactions SET project_id = default_project_id WHERE project_id IS NULL;
    ALTER TABLE transactions ALTER COLUMN project_id SET NOT NULL;
    CREATE INDEX idx_transactions_project_id ON transactions(project_id);
  END IF;

  -- Add project_id to card_transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_transactions' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE card_transactions ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE card_transactions SET project_id = default_project_id WHERE project_id IS NULL;
    ALTER TABLE card_transactions ALTER COLUMN project_id SET NOT NULL;
    CREATE INDEX idx_card_transactions_project_id ON card_transactions(project_id);
  END IF;

  -- Add project_id to tariff_settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tariff_settings' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE tariff_settings ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE tariff_settings SET project_id = default_project_id WHERE project_id IS NULL;
    ALTER TABLE tariff_settings ALTER COLUMN project_id SET NOT NULL;
    CREATE INDEX idx_tariff_settings_project_id ON tariff_settings(project_id);
  END IF;

  -- Add project_id to audit_logs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE audit_logs SET project_id = default_project_id WHERE project_id IS NULL;
    CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);
  END IF;

  -- Add project_id to receipt_field_changes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipt_field_changes' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE receipt_field_changes ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE receipt_field_changes SET project_id = default_project_id WHERE project_id IS NULL;
    CREATE INDEX idx_receipt_field_changes_project_id ON receipt_field_changes(project_id);
  END IF;

  -- Add project_id to accepted_orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accepted_orders' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE accepted_orders ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE accepted_orders SET project_id = default_project_id WHERE project_id IS NULL;
    CREATE INDEX idx_accepted_orders_project_id ON accepted_orders(project_id);
  END IF;

  -- Add project_id to order_photos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_photos' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE order_photos ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
    UPDATE order_photos SET project_id = default_project_id WHERE project_id IS NULL;
    CREATE INDEX idx_order_photos_project_id ON order_photos(project_id);
  END IF;

END $$;