/*
  # Add Missing Fields to Accepted Orders

  1. Changes
    - Add `title` field to store product name
    - Add `client_id` field to store client identifier
    - Add `part_number` field to store part number
    - Add `link` field to store product link
  
  2. Notes
    - These fields are necessary for displaying complete order information
    - All fields are optional as existing records may not have this data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accepted_orders' AND column_name = 'title'
  ) THEN
    ALTER TABLE accepted_orders ADD COLUMN title text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accepted_orders' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE accepted_orders ADD COLUMN client_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accepted_orders' AND column_name = 'part_number'
  ) THEN
    ALTER TABLE accepted_orders ADD COLUMN part_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accepted_orders' AND column_name = 'link'
  ) THEN
    ALTER TABLE accepted_orders ADD COLUMN link text;
  END IF;
END $$;