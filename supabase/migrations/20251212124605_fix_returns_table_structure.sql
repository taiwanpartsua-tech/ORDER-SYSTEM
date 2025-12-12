/*
  # Виправлення структури таблиці returns

  ## Зміни:
  
  1. Додано відсутні поля до таблиці returns:
     - client_id - ID клієнта
     - title - Назва замовлення
     - link - Посилання на замовлення
     - tracking_pl - Трекінг номер в Польщі
     - part_price - Вартість запчастини
     - delivery_cost - Вартість доставки
     - total_cost - Загальна вартість
     - part_number - Номер запчастини
     - payment_type - Тип оплати
     - cash_on_delivery - Побранє
     - order_date - Дата замовлення
     - return_tracking_to_supplier - Трекінг повернення до постачальника
     - discussion_link - Посилання на обговорення
     - situation_description - Опис ситуації
     - substatus - Підстатус повернення
     - updated_at - Час останнього оновлення
  
  2. Видалено застарілі поля, які не використовуються в коді
*/

-- Додати нові поля
DO $$ 
BEGIN
  -- Додати client_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE returns ADD COLUMN client_id text;
  END IF;

  -- Додати title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'title'
  ) THEN
    ALTER TABLE returns ADD COLUMN title text;
  END IF;

  -- Додати link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'link'
  ) THEN
    ALTER TABLE returns ADD COLUMN link text;
  END IF;

  -- Додати tracking_pl
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'tracking_pl'
  ) THEN
    ALTER TABLE returns ADD COLUMN tracking_pl text;
  END IF;

  -- Додати part_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'part_price'
  ) THEN
    ALTER TABLE returns ADD COLUMN part_price numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати delivery_cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'delivery_cost'
  ) THEN
    ALTER TABLE returns ADD COLUMN delivery_cost numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати total_cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE returns ADD COLUMN total_cost numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати part_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'part_number'
  ) THEN
    ALTER TABLE returns ADD COLUMN part_number text;
  END IF;

  -- Додати payment_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE returns ADD COLUMN payment_type text DEFAULT 'оплачено'
      CHECK (payment_type IN ('оплачено', 'побранє', 'самовивіз pl'));
  END IF;

  -- Додати cash_on_delivery
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'cash_on_delivery'
  ) THEN
    ALTER TABLE returns ADD COLUMN cash_on_delivery numeric(15,2) DEFAULT 0;
  END IF;

  -- Додати order_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'order_date'
  ) THEN
    ALTER TABLE returns ADD COLUMN order_date date DEFAULT CURRENT_DATE;
  END IF;

  -- Додати return_tracking_to_supplier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'return_tracking_to_supplier'
  ) THEN
    ALTER TABLE returns ADD COLUMN return_tracking_to_supplier text;
  END IF;

  -- Додати discussion_link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'discussion_link'
  ) THEN
    ALTER TABLE returns ADD COLUMN discussion_link text;
  END IF;

  -- Додати situation_description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'situation_description'
  ) THEN
    ALTER TABLE returns ADD COLUMN situation_description text;
  END IF;

  -- Додати substatus
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'substatus'
  ) THEN
    ALTER TABLE returns ADD COLUMN substatus text DEFAULT 'В Арта в хелмі';
  END IF;

  -- Додати updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE returns ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Видалити застарілі поля
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'return_date'
  ) THEN
    ALTER TABLE returns DROP COLUMN return_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'reason'
  ) THEN
    ALTER TABLE returns DROP COLUMN reason;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'amount'
  ) THEN
    ALTER TABLE returns DROP COLUMN amount;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'manager_name'
  ) THEN
    ALTER TABLE returns DROP COLUMN manager_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'returns' AND column_name = 'notes'
  ) THEN
    ALTER TABLE returns DROP COLUMN notes;
  END IF;
END $$;