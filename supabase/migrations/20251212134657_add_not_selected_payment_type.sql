/*
  # Додавання типу оплати "Не обрано"

  ## Зміни
  Оновлюємо обмеження CHECK для поля payment_type в таблиці orders,
  щоб додати новий тип оплати "не обрано":
  - 'не обрано' (не обрано - за замовчуванням)
  - 'оплачено' (оплачено)
  - 'побранє' (накладений платіж)
  - 'самовивіз pl' (самовивіз в Польщі)

  ## Примітки
  Також оновлюємо таблицю returns для підтримки цього типу.
*/

-- Оновлення обмеження для таблиці orders
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_payment_type_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_payment_type_check;
  END IF;
END $$;

ALTER TABLE orders 
ADD CONSTRAINT orders_payment_type_check 
CHECK (payment_type IS NULL OR payment_type IN ('не обрано', 'оплачено', 'побранє', 'самовивіз pl'));

-- Оновлення обмеження для таблиці returns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'returns_payment_type_check'
  ) THEN
    ALTER TABLE returns DROP CONSTRAINT returns_payment_type_check;
  END IF;
END $$;

ALTER TABLE returns 
ADD CONSTRAINT returns_payment_type_check 
CHECK (payment_type IS NULL OR payment_type IN ('не обрано', 'оплачено', 'побранє', 'самовивіз pl'));
