/*
  # Додавання manager_id до returns

  ## Зміни:
  
  1. Додано поле manager_id з зовнішнім ключем до таблиці managers
  
  ## Безпека:
     - Політики доступу залишаються без змін
*/

DO $$ 
BEGIN
  -- Додати manager_id якщо не існує
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE returns ADD COLUMN manager_id uuid REFERENCES managers(id);
  END IF;
END $$;