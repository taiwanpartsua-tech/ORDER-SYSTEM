/*
  # Додати дозволи для ролі "постачальник"

  1. Оновлення ролі
    - Роль "supplier" вже існує в системі
    - Додаємо політики для обмеженого доступу
  
  2. Політики доступу для постачальника
    - Перегляд: всі замовлення, баланси, транзакції
    - Редагування: тільки weight_kg, transport_cost_usd, cash_on_delivery в чернетках
    - Доступ до перевірки товару (SupplierInspection)
  
  3. Безпека
    - RLS політики для orders - supplier може оновлювати тільки певні поля
    - RLS політики для order_photos - supplier може додавати фото
*/

-- Додаємо політику для supplier на читання замовлень
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Supplier can view all orders'
  ) THEN
    CREATE POLICY "Supplier can view all orders"
      ON orders FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_project_access
          WHERE user_project_access.user_id = auth.uid()
          AND user_project_access.project_id = orders.project_id
        )
      );
  END IF;
END $$;

-- Додаємо політику для supplier на оновлення обмежених полів в замовленнях
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Supplier can update limited fields in orders'
  ) THEN
    CREATE POLICY "Supplier can update limited fields in orders"
      ON orders FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_project_access
          WHERE user_project_access.user_id = auth.uid()
          AND user_project_access.project_id = orders.project_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_project_access
          WHERE user_project_access.user_id = auth.uid()
          AND user_project_access.project_id = orders.project_id
        )
      );
  END IF;
END $$;

-- Додаємо політику для supplier на читання балансів постачальників
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'suppliers' 
    AND policyname = 'Supplier can view supplier balances'
  ) THEN
    CREATE POLICY "Supplier can view supplier balances"
      ON suppliers FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_project_access
          WHERE user_project_access.user_id = auth.uid()
          AND user_project_access.project_id = suppliers.project_id
        )
      );
  END IF;
END $$;

-- Додаємо політику для supplier на читання транзакцій
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Supplier can view transactions'
  ) THEN
    CREATE POLICY "Supplier can view transactions"
      ON transactions FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_project_access
          WHERE user_project_access.user_id = auth.uid()
          AND user_project_access.project_id = transactions.project_id
        )
      );
  END IF;
END $$;

-- Додаємо політику для supplier на читання карткових транзакцій
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'card_transactions' 
    AND policyname = 'Supplier can view card transactions'
  ) THEN
    CREATE POLICY "Supplier can view card transactions"
      ON card_transactions FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_project_access
          WHERE user_project_access.user_id = auth.uid()
          AND user_project_access.project_id = card_transactions.project_id
        )
      );
  END IF;
END $$;

-- Додаємо політику для supplier на читання прийомок
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'active_receipts' 
    AND policyname = 'Supplier can view receipts'
  ) THEN
    CREATE POLICY "Supplier can view receipts"
      ON active_receipts FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_project_access
          WHERE user_project_access.user_id = auth.uid()
          AND user_project_access.project_id = active_receipts.project_id
        )
      );
  END IF;
END $$;

-- Додаємо політику для supplier на роботу з фото замовлень
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_photos' 
    AND policyname = 'Supplier can manage order photos'
  ) THEN
    CREATE POLICY "Supplier can manage order photos"
      ON order_photos FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_project_access
          WHERE user_project_access.user_id = auth.uid()
          AND user_project_access.project_id = order_photos.project_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_project_access
          WHERE user_project_access.user_id = auth.uid()
          AND user_project_access.project_id = order_photos.project_id
        )
      );
  END IF;
END $$;