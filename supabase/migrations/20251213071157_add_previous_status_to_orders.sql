/*
  # Додавання попереднього статусу до замовлень

  ## Зміни
  
  1. Поля
    - Додається поле `previous_status` до таблиці `orders` для збереження попереднього статусу
    - Це поле використовується при поверненні замовлення з активного прийому
  
  2. Логіка
    - При додаванні замовлення до прийомки зберігається поточний статус
    - При видаленні замовлення з прийомки статус відновлюється
*/

-- Додаємо поле previous_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'previous_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN previous_status text;
  END IF;
END $$;