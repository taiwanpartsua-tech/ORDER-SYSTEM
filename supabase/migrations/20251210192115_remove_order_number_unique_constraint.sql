/*
  # Видалити UNIQUE constraint з order_number

  ## Зміни
  
  1. Видаляємо UNIQUE constraint з поля `order_number`
    - Це дозволить створювати кілька замовлень з пустим номером
    - Користувач зможе створити замовлення з будь-яким полем
  
  ## Примітки
  - Після цієї зміни order_number не обов'язково має бути унікальним
  - Це необхідно, оскільки тепер можна створювати замовлення з пустим номером
*/

-- Видаляємо UNIQUE constraint з order_number
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_order_number_key'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_order_number_key;
  END IF;
END $$;
