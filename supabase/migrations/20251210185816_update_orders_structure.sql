/*
  # Оновлення структури таблиці замовлень

  ## Зміни
  
  Додаємо нові поля до таблиці `orders`:
  - `title` (text) - Назва товару
  - `link` (text) - Посилання на товар
  - `tracking_pl` (text) - Номер трекінгу в Польщі
  - `part_price` (decimal) - Вартість запчастини
  - `delivery_cost` (decimal) - Доставка від поляка
  - `total_cost` (decimal) - Вартість + доставка
  - `part_number` (text) - Номер запчастини
  - `cash_on_delivery` (boolean) - Побранє
  - `client_id` (text) - ID клієнта
  - `received_pln` (decimal) - Прийом в злотих
  - `transport_cost_usd` (decimal) - Вартість перевезення в доларах
  - `weight_kg` (decimal) - Вага в кілограмах
  - `verified` (boolean) - Позначка V (верифіковано)
*/

DO $$
BEGIN
  -- Додаємо нові поля якщо їх немає
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'title') THEN
    ALTER TABLE orders ADD COLUMN title text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'link') THEN
    ALTER TABLE orders ADD COLUMN link text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_pl') THEN
    ALTER TABLE orders ADD COLUMN tracking_pl text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'part_price') THEN
    ALTER TABLE orders ADD COLUMN part_price decimal(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_cost') THEN
    ALTER TABLE orders ADD COLUMN delivery_cost decimal(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_cost') THEN
    ALTER TABLE orders ADD COLUMN total_cost decimal(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'part_number') THEN
    ALTER TABLE orders ADD COLUMN part_number text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cash_on_delivery') THEN
    ALTER TABLE orders ADD COLUMN cash_on_delivery boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_id') THEN
    ALTER TABLE orders ADD COLUMN client_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'received_pln') THEN
    ALTER TABLE orders ADD COLUMN received_pln decimal(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'transport_cost_usd') THEN
    ALTER TABLE orders ADD COLUMN transport_cost_usd decimal(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'weight_kg') THEN
    ALTER TABLE orders ADD COLUMN weight_kg decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'verified') THEN
    ALTER TABLE orders ADD COLUMN verified boolean DEFAULT false;
  END IF;
END $$;