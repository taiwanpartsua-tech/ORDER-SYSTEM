/*
  # Виправлення обмеження status для таблиці returns

  ## Зміни:
  
  1. Видалення старого constraint для status
  2. Додавання нового constraint, який дозволяє українське значення 'повернення'
  
  ## Примітки:
     - Constraint тепер дозволяє значення 'повернення' (українське) для поля status
     - Це виправляє помилку при створенні повернення з українським статусом
*/

-- Видалити старий constraint якщо він існує
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'returns' AND constraint_name = 'returns_status_check'
  ) THEN
    ALTER TABLE returns DROP CONSTRAINT returns_status_check;
  END IF;
END $$;

-- Додати новий constraint, який дозволяє 'повернення'
ALTER TABLE returns ADD CONSTRAINT returns_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'повернення'));