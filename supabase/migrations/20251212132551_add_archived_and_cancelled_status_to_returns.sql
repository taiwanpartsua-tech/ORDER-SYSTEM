/*
  # Add archived field and cancelled status to returns

  1. Changes
    - Add `archived` boolean field to track archived returns
    - Add 'анульовано' status to the status constraint
    - Create index on archived field for better query performance

  2. Notes
    - Returns with status 'анульовано' will be automatically moved to archive
    - Active returns will show all statuses except 'анульовано'
    - Archived returns will primarily contain those with 'анульовано' status
*/

-- Add archived field to returns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'returns' AND column_name = 'archived'
  ) THEN
    ALTER TABLE returns ADD COLUMN archived BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Drop the existing status constraint
ALTER TABLE returns DROP CONSTRAINT IF EXISTS returns_status_check;

-- Add new status constraint with 'анульовано' status
ALTER TABLE returns ADD CONSTRAINT returns_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'повернення', 'анульовано'));

-- Create index on archived field for better performance
CREATE INDEX IF NOT EXISTS idx_returns_archived ON returns(archived);

-- Create index on status field for better performance
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);