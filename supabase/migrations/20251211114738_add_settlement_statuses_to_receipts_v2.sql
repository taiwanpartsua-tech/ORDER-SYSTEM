/*
  # Add Settlement Statuses to Active Receipts

  1. Changes
    - Drop existing status constraint on active_receipts
    - Update any invalid status values to 'draft'
    - Add new constraint with additional statuses:
      - 'draft' - чернетка
      - 'approved' - підтверджено
      - 'sent_for_settlement' - передано на розрахунок
      - 'settled' - розраховано
    - Add settlement_date field to track when receipt was sent for settlement
    - Add settled_date field to track when receipt was fully settled
    
  2. Notes
    - When status changes to 'sent_for_settlement', a debit transaction should be created
    - When status changes to 'settled', all payments should be completed
*/

-- Drop existing constraint
ALTER TABLE active_receipts DROP CONSTRAINT IF EXISTS active_receipts_status_check;

-- Update any invalid statuses to 'draft'
UPDATE active_receipts 
SET status = 'draft' 
WHERE status NOT IN ('draft', 'approved', 'sent_for_settlement', 'settled');

-- Add new constraint with extended statuses
ALTER TABLE active_receipts 
  ADD CONSTRAINT active_receipts_status_check 
  CHECK (status IN ('draft', 'approved', 'sent_for_settlement', 'settled'));

-- Add settlement tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'settlement_date'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN settlement_date timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_receipts' AND column_name = 'settled_date'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN settled_date timestamptz;
  END IF;
END $$;
