/*
  # Add 'проблемні' status to returns

  1. Changes
    - Update status constraint to include 'проблемні' status

  2. Notes
    - Returns with status 'проблемні' or 'анульовано' will be archived
*/

-- Drop the existing status constraint
ALTER TABLE returns DROP CONSTRAINT IF EXISTS returns_status_check;

-- Add new status constraint with 'проблемні' status
ALTER TABLE returns ADD CONSTRAINT returns_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'повернення', 'проблемні', 'анульовано'));