/*
  # Додавання відсутніх полів до таблиці orders

  ## Зміни
  Додаються поля, які очікує фронтенд для роботи з замовленнями:
  - `client_id` (text) - ідентифікатор клієнта
  - `title` (text) - назва товару
  - `link` (text) - посилання на товар
  - `tracking_pl` (text) - трекінг-номер для Польщі
  - `part_price` (numeric) - вартість запчастини
  - `delivery_cost` (numeric) - вартість доставки
  - `total_cost` (numeric) - загальна вартість
  - `part_number` (text) - номер запчастини
  - `received_pln` (numeric) - отримано злотих
  - `transport_cost_usd` (numeric) - вартість транспортування в доларах
  - `weight_kg` (numeric) - вага в кілограмах
  - `verified` (boolean) - чи перевірено замовлення
  - `order_date` (date) - дата замовлення
  - `archived_at` (timestamptz) - дата архівування

  ## Примітки
  Всі поля є опціональними для сумісності з існуючими записами.
*/

-- Додавання відсутніх полів до таблиці orders
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
    ALTER TABLE orders ADD COLUMN part_price numeric(20,2) DEFAULT 0;
  END IF;

  -- delivery_cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_cost'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_cost numeric(20,2) DEFAULT 0;
  END IF;

  -- total_cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_cost numeric(20,2) DEFAULT 0;
  END IF;

  -- part_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'part_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN part_number text;
  END IF;

  -- received_pln
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'received_pln'
  ) THEN
    ALTER TABLE orders ADD COLUMN received_pln numeric(20,2) DEFAULT 0;
  END IF;

  -- transport_cost_usd
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'transport_cost_usd'
  ) THEN
    ALTER TABLE orders ADD COLUMN transport_cost_usd numeric(20,2) DEFAULT 0;
  END IF;

  -- weight_kg
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'weight_kg'
  ) THEN
    ALTER TABLE orders ADD COLUMN weight_kg numeric(20,2) DEFAULT 0;
  END IF;

  -- verified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'verified'
  ) THEN
    ALTER TABLE orders ADD COLUMN verified boolean DEFAULT false;
  END IF;

  -- order_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_date date DEFAULT CURRENT_DATE;
  END IF;

  -- archived_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN archived_at timestamptz;
  END IF;
END $$;