/*
  # Add Explanation Field to Accepted Orders

  1. Changes
    - Add `explanation` field to store reason for accepting order without document
    - This field will be displayed as a tooltip when hovering over "прийнято без документу"
  
  2. Notes
    - Field is optional but recommended to provide context for document-less acceptance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accepted_orders' AND column_name = 'explanation'
  ) THEN
    ALTER TABLE accepted_orders ADD COLUMN explanation text;
  END IF;
END $$;