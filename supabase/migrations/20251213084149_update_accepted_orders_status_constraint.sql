/*
  # Update accepted_orders status constraint to include all statuses

  1. Changes
    - Drop existing status constraint
    - Add new constraint with all possible status values
    
  2. Security
    - No changes to RLS policies needed
*/

-- Drop existing constraint
ALTER TABLE accepted_orders DROP CONSTRAINT IF EXISTS accepted_orders_status_check;

-- Add new constraint with all statuses
ALTER TABLE accepted_orders ADD CONSTRAINT accepted_orders_status_check 
CHECK (status IN (
  'в роботі на сьогодні',
  'в роботі на вчора',
  'в роботі на завтра',
  'на броні',
  'очікується',
  'прийнято сьогодні',
  'прийнято',
  'на складі',
  'в дорозі',
  'в вигрузці',
  'готово до відправки',
  'в активному прийомі',
  'на звірці',
  'повернення',
  'проблемні',
  'анульовано',
  'на відправці',
  'надіслано',
  'зупинено',
  'очікується посилка',
  'треба зробити повернення',
  'в архиві',
  'скасовано',
  'оформити карткою'
));