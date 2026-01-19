/*
  # Add Vladyslav Kuzniak Counterparty and Rename ROMAN

  ## Changes
    - Rename existing ROMAN counterparty to "Roman Paskevych"
    - Add new counterparty "Vladyslav Kuzniak"
    - Update trigger function to use "Roman Paskevych" as default

  ## Notes
    - All existing orders with ROMAN counterparty will be automatically updated
    - New orders will default to "Roman Paskevych"
    - Old orders without counterparty remain unchanged (can be set manually)
*/

-- Update existing ROMAN counterparty to "Roman Paskevych"
UPDATE counterparties 
SET 
  name = 'Roman Paskevych',
  code = 'ROMAN_P',
  updated_at = now()
WHERE name = 'ROMAN';

-- Add new counterparty "Vladyslav Kuzniak" for each project
INSERT INTO counterparties (name, code, project_id, is_active)
SELECT 'Vladyslav Kuzniak', 'VLAD_K', id, true 
FROM projects
ON CONFLICT (name, project_id) DO NOTHING;

-- Update the trigger function to use "Roman Paskevych" as default
CREATE OR REPLACE FUNCTION set_default_counterparty()
RETURNS TRIGGER AS $$
DECLARE
  roman_id uuid;
BEGIN
  -- Only set counterparty_id if it's not already provided
  IF NEW.counterparty_id IS NULL THEN
    -- Get the Roman Paskevych counterparty ID
    SELECT id INTO roman_id 
    FROM counterparties 
    WHERE name = 'Roman Paskevych' 
    LIMIT 1;
    
    -- Set it as the default
    IF roman_id IS NOT NULL THEN
      NEW.counterparty_id := roman_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;