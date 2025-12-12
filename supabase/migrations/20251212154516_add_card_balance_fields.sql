/*
  # Додати окремі баланси для карткових розрахунків

  1. Зміни
    - Додаємо поля `card_balance_parts_pln` та `card_balance_delivery_pln` до таблиці suppliers
    - Ці поля використовуються ТІЛЬКИ для замовлень з payment_type = 'оплачено'
    - Існуючі поля `balance_parts_pln` та `balance_delivery_pln` залишаються для загального балансу

  2. Примітки
    - Для карткових розрахунків використовуємо card_balance_*
    - Для загального балансу (прийом + побраня + перевезення) використовуємо balance_*
*/

-- Додаємо нові поля для карткових балансів
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'card_balance_parts_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN card_balance_parts_pln numeric(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'card_balance_delivery_pln'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN card_balance_delivery_pln numeric(15,2) DEFAULT 0;
  END IF;
END $$;
