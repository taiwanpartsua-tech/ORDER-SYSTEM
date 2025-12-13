/*
  # Fix accepted_orders status constraint

  1. Changes
    - Drop existing status constraint
    - Add new constraint with correct status values matching Orders component
    
  2. Security
    - No changes to RLS policies needed
*/

-- Drop existing constraint
ALTER TABLE accepted_orders DROP CONSTRAINT IF EXISTS accepted_orders_status_check;

-- Add new constraint with all valid statuses
ALTER TABLE accepted_orders ADD CONSTRAINT accepted_orders_status_check 
CHECK (status IN (
  'в роботі на сьогодні',
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
  'анульовано'
));