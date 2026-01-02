/*
  # Додавання менеджера до замовлень

  1. Зміни в таблиці orders
    - Додано `manager_id` (uuid, nullable) - посилання на менеджера, який створив замовлення
    - Foreign key до user_profiles(id)

  2. Важливі примітки
    - Поле є необов'язковим (nullable)
    - При видаленні користувача поле буде встановлено в NULL
    - Менеджером може бути будь-який користувач з таблиці user_profiles
*/

-- Додавання поля manager_id до orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN manager_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Індекс для швидкого пошуку замовлень за менеджером
CREATE INDEX IF NOT EXISTS idx_orders_manager_id ON orders(manager_id);