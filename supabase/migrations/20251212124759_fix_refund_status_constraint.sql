/*
  # Виправлення обмеження refund_status

  ## Зміни:
  
  1. Видалення старого constraint для refund_status
  2. Додавання нового constraint, який дозволяє NULL, порожній рядок або правильні значення
  
  ## Примітки:
     - Тепер refund_status може бути NULL, '' або одним з дозволених значень
     - Це виправляє помилку при створенні повернення
*/

-- Видалити старі constraints якщо вони існують
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'returns' AND constraint_name = 'returns_refund_status_check'
  ) THEN
    ALTER TABLE returns DROP CONSTRAINT returns_refund_status_check;
  END IF;
END $$;

-- Додати новий constraint, який дозволяє NULL, порожній рядок або конкретні значення
ALTER TABLE returns ADD CONSTRAINT returns_refund_status_check 
  CHECK (
    refund_status IS NULL OR 
    refund_status = '' OR 
    refund_status IN ('оплачено поляком', 'надіслано реквізити для повернення', 'кошти повернено')
  );