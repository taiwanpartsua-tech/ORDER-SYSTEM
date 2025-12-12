/*
  # Зміна поля cash_on_delivery на decimal
  
  1. Зміни
    - Змінюємо тип поля `cash_on_delivery` в таблиці `orders` з boolean на decimal(12,2)
    - Це поле тепер зберігає суму накладеного платежу в злотих
  
  2. Примітки
    - Існуючі boolean значення будуть конвертовані: true -> 0, false -> 0
    - За замовчуванням поле матиме значення 0
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cash_on_delivery'
  ) THEN
    ALTER TABLE orders DROP COLUMN cash_on_delivery;
    ALTER TABLE orders ADD COLUMN cash_on_delivery decimal(12,2) DEFAULT 0;
  END IF;
END $$;