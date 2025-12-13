/*
  # Add status field to accepted_orders table

  1. Changes
    - Add `status` column to `accepted_orders` table
    - Set default status to 'в роботі на сьогодні'
    - Add check constraint to ensure only valid status values are used
    
  2. Security
    - No changes to RLS policies needed
*/

-- Add status column to accepted_orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accepted_orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE accepted_orders ADD COLUMN status text DEFAULT 'в роботі на сьогодні';
  END IF;
END $$;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'accepted_orders_status_check'
  ) THEN
    ALTER TABLE accepted_orders ADD CONSTRAINT accepted_orders_status_check 
    CHECK (status IN (
      'в роботі на сьогодні',
      'в роботі на вчора',
      'в роботі на завтра',
      'прийнято',
      'на відправці',
      'надіслано',
      'зупинено',
      'проблемні',
      'очікується посилка',
      'треба зробити повернення',
      'в архиві',
      'скасовано',
      'оформити карткою',
      'на звірці'
    ));
  END IF;
END $$;