/*
  # Sync orders status constraint with frontend

  1. Changes
    - Drop existing status constraint on orders table
    - Add new constraint with all valid statuses matching Orders component
    
  2. Status List
    - в роботі на сьогодні
    - на броні
    - очікується
    - прийнято сьогодні
    - прийнято
    - на складі
    - в дорозі
    - в вигрузці
    - готово до відправки
    - в активному прийомі
    - на звірці
    - повернення
    - проблемні
    - анульовано
*/

-- Drop existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with all valid statuses
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
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