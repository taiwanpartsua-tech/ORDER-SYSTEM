/*
  # Додавання відстеження користувачів до прийомок та взаєморозрахунків

  1. Зміни в таблиці active_receipts
    - Додано `created_by` (uuid) - користувач, який створив чернетку
    - Додано `approved_by` (uuid) - користувач, який затвердив прийомку
    - Додано `settled_by` (uuid) - користувач, який провів взаєморозрахунок
    
  2. Зміни в таблиці receipts
    - Додано `created_by` (uuid) - користувач, який створив прийомку
    - Додано `settled_by` (uuid) - користувач, який провів взаєморозрахунок

  3. Важливі примітки
    - Всі нові поля є опціональними (nullable)
    - Додано зовнішні ключі до таблиці user_profiles
    - Додано індекси для швидкого пошуку за користувачами
*/

-- Додавання полів до active_receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_receipts' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_receipts' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_receipts' AND column_name = 'settled_by'
  ) THEN
    ALTER TABLE active_receipts ADD COLUMN settled_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Додавання полів до receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE receipts ADD COLUMN created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'settled_by'
  ) THEN
    ALTER TABLE receipts ADD COLUMN settled_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Додавання індексів для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_active_receipts_created_by ON active_receipts(created_by);
CREATE INDEX IF NOT EXISTS idx_active_receipts_approved_by ON active_receipts(approved_by);
CREATE INDEX IF NOT EXISTS idx_active_receipts_settled_by ON active_receipts(settled_by);
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON receipts(created_by);
CREATE INDEX IF NOT EXISTS idx_receipts_settled_by ON receipts(settled_by);