/*
  # Додавання поля payment_type до таблиці orders
  
  1. Зміни
    - Додаємо поле `payment_type` в таблицю `orders`
    - Тип: text з значенням за замовчуванням 'оплачено'
    - Можливі значення: 'оплачено', 'побранє', 'самовивіз pl'
  
  2. Примітки
    - Це підстатус для групування замовлень за типом оплати/доставки
    - За замовчуванням встановлено 'оплачено' (більшість замовлень)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_type text DEFAULT 'оплачено';
  END IF;
END $$;