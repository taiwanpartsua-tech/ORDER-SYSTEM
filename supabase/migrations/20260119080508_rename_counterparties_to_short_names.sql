/*
  # Rename Counterparties to Short Names

  ## Changes
    - Rename "Roman Paskevych" to "Roman"
    - Rename "Vladyslav Kuzniak" to "Vladyslav"
    - Update trigger function to use "Roman" as default

  ## Notes
    - All existing orders with these counterparties will be automatically updated
*/

-- Update Roman Paskevych to Roman
UPDATE counterparties 
SET 
  name = 'Roman',
  code = 'ROMAN',
  updated_at = now()
WHERE name = 'Roman Paskevych';

-- Update Vladyslav Kuzniak to Vladyslav
UPDATE counterparties 
SET 
  name = 'Vladyslav',
  code = 'VLAD',
  updated_at = now()
WHERE name = 'Vladyslav Kuzniak';

-- Update the trigger function to use "Roman" as default
CREATE OR REPLACE FUNCTION set_default_counterparty()
RETURNS TRIGGER AS $$
DECLARE
  roman_id uuid;
BEGIN
  -- Only set counterparty_id if it's not already provided
  IF NEW.counterparty_id IS NULL THEN
    -- Get the Roman counterparty ID
    SELECT id INTO roman_id 
    FROM counterparties 
    WHERE name = 'Roman' 
    LIMIT 1;
    
    -- Set it as the default
    IF roman_id IS NOT NULL THEN
      NEW.counterparty_id := roman_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;