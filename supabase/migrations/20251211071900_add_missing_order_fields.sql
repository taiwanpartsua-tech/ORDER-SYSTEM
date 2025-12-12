/*
  # Додавання відсутніх полів до таблиці orders

  ## Опис
  Ця міграція додає всі необхідні поля до таблиці orders, які використовуються в додатку.

  ## Зміни
  
  ### Нові колонки в таблиці orders:
  - `client_id` (text) - ID клієнта
  - `title` (text) - назва товару/запчастини
  - `link` (text) - посилання на товар
  - `tracking_pl` (text) - номер відстеження в Польщі
  - `part_price` (decimal) - вартість запчастини в злотих
  - `delivery_cost` (decimal) - вартість доставки в злотих
  - `total_cost` (decimal) - загальна вартість (запчастина + доставка)
  - `part_number` (text) - номер запчастини
  - `order_date` (date) - дата замовлення
  - `notes` (text) - примітки
  - `received_pln` (decimal) - прийом в злотих
  - `transport_cost_usd` (decimal) - вартість перевезення в доларах
  - `weight_kg` (decimal) - вага в кілограмах
  - `verified` (boolean) - чи відзначено V (перевірено)
  
  ## Примітки
  Всі поля є опціональними (nullable) для сумісності з існуючими даними
*/

-- Додавання нових полів до таблиці orders
DO $$
BEGIN
  -- client_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN client_id text;
  END IF;

  -- title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'title'
  ) THEN
    ALTER TABLE orders ADD COLUMN title text;
  END IF;

  -- link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'link'
  ) THEN
    ALTER TABLE orders ADD COLUMN link text;
  END IF;

  -- tracking_pl
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tracking_pl'
  ) THEN
    ALTER TABLE orders ADD COLUMN tracking_pl text;
  END IF;

  -- part_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'part_price'
  ) THEN
    ALTER TABLE orders ADD COLUMN part_price decimal(10,2) DEFAULT 0;
  END IF;

  -- delivery_cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_cost'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_cost decimal(10,2) DEFAULT 0;
  END IF;

  -- total_cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_cost decimal(10,2) DEFAULT 0;
  END IF;

  -- part_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'part_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN part_number text;
  END IF;

  -- order_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_date date DEFAULT CURRENT_DATE;
  END IF;

  -- notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN notes text;
  END IF;

  -- received_pln
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'received_pln'
  ) THEN
    ALTER TABLE orders ADD COLUMN received_pln decimal(10,2) DEFAULT 0;
  END IF;

  -- transport_cost_usd
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'transport_cost_usd'
  ) THEN
    ALTER TABLE orders ADD COLUMN transport_cost_usd decimal(10,2) DEFAULT 0;
  END IF;

  -- weight_kg
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'weight_kg'
  ) THEN
    ALTER TABLE orders ADD COLUMN weight_kg decimal(10,2) DEFAULT 0;
  END IF;

  -- verified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'verified'
  ) THEN
    ALTER TABLE orders ADD COLUMN verified boolean DEFAULT false;
  END IF;
END $$;