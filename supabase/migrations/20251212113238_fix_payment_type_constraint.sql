/*
  # Виправлення обмеження для payment_type

  ## Зміни
  Оновлюємо обмеження CHECK для поля payment_type в таблиці orders,
  щоб підтримувати українські значення, які використовує фронтенд:
  - 'оплачено' (оплачено)
  - 'побранє' (накладений платіж)
  - 'самовивіз pl' (самовивіз в Польщі)

  ## Примітки
  Видаляємо старе обмеження та створюємо нове з правильними значеннями.
*/

-- Видалення старого обмеження, якщо воно існує
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_payment_type_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_payment_type_check;
  END IF;
END $$;

-- Додавання нового обмеження з українськими значеннями
ALTER TABLE orders 
ADD CONSTRAINT orders_payment_type_check 
CHECK (payment_type IS NULL OR payment_type IN ('оплачено', 'побранє', 'самовивіз pl'));