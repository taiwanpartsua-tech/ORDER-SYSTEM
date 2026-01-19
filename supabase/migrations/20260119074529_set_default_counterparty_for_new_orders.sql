/*
  # Set Default Counterparty for New Orders

  ## Changes
    - Create a trigger function to automatically set counterparty_id to ROMAN for new orders if not provided
    - This ensures all new orders have a counterparty by default

  ## Notes
    - Existing orders (created before this migration) will NOT have their counterparty_id changed
    - Only new orders without an explicit counterparty_id will get ROMAN as default
*/

-- Create function to set default counterparty to ROMAN for new orders
CREATE OR REPLACE FUNCTION set_default_counterparty()
RETURNS TRIGGER AS $$
DECLARE
  roman_id uuid;
BEGIN
  -- Only set counterparty_id if it's not already provided
  IF NEW.counterparty_id IS NULL THEN
    -- Get the ROMAN counterparty ID
    SELECT id INTO roman_id 
    FROM counterparties 
    WHERE name = 'ROMAN' 
    LIMIT 1;
    
    -- Set it as the default
    IF roman_id IS NOT NULL THEN
      NEW.counterparty_id := roman_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for orders table
DROP TRIGGER IF EXISTS set_default_counterparty_for_orders ON orders;
CREATE TRIGGER set_default_counterparty_for_orders
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_default_counterparty();

-- Create trigger for returns table
DROP TRIGGER IF EXISTS set_default_counterparty_for_returns ON returns;
CREATE TRIGGER set_default_counterparty_for_returns
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION set_default_counterparty();

-- Create trigger for active_receipts table
DROP TRIGGER IF EXISTS set_default_counterparty_for_active_receipts ON active_receipts;
CREATE TRIGGER set_default_counterparty_for_active_receipts
  BEFORE INSERT ON active_receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_default_counterparty();

-- Create trigger for accepted_orders table
DROP TRIGGER IF EXISTS set_default_counterparty_for_accepted_orders ON accepted_orders;
CREATE TRIGGER set_default_counterparty_for_accepted_orders
  BEFORE INSERT ON accepted_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_default_counterparty();