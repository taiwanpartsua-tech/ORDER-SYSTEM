/*
  # Додати доступ постачальника до звірки прийомок

  1. Додаткові політики для постачальника
    - Перегляд receipt_orders (через active_receipts)
    - Перегляд receipt_order_snapshots (через active_receipts)
    - Перегляд receipt_field_changes
    - Перегляд accepted_orders
    - Перегляд returns
*/

-- Політика для перегляду receipt_orders (через active_receipts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'receipt_orders' 
    AND policyname = 'Supplier can view receipt orders'
  ) THEN
    CREATE POLICY "Supplier can view receipt orders"
      ON receipt_orders FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM active_receipts
          JOIN user_project_access ON user_project_access.project_id = active_receipts.project_id
          WHERE active_receipts.id = receipt_orders.receipt_id
          AND user_project_access.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Політика для перегляду receipt_order_snapshots (через active_receipts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'receipt_order_snapshots' 
    AND policyname = 'Supplier can view receipt order snapshots'
  ) THEN
    CREATE POLICY "Supplier can view receipt order snapshots"
      ON receipt_order_snapshots FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'supplier'
          AND user_profiles.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM active_receipts
          JOIN user_project_access ON user_project_access.project_id = active_receipts.project_id
          WHERE active_receipts.id = receipt_order_snapshots.receipt_id
          AND user_project_access.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Політика для перегляду receipt_field_changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'receipt_field_changes' 
    AND policyname = 'Supplier can view receipt field changes'
  ) THEN
    CREATE POLICY "Supplier can view receipt field changes"
      ON receipt_field_changes FOR SELECT
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
          AND user_project_access.project_id = receipt_field_changes.project_id
        )
      );
  END IF;
END $$;

-- Політика для перегляду accepted_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'accepted_orders' 
    AND policyname = 'Supplier can view accepted orders'
  ) THEN
    CREATE POLICY "Supplier can view accepted orders"
      ON accepted_orders FOR SELECT
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
          AND user_project_access.project_id = accepted_orders.project_id
        )
      );
  END IF;
END $$;

-- Політика для перегляду returns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'returns' 
    AND policyname = 'Supplier can view returns'
  ) THEN
    CREATE POLICY "Supplier can view returns"
      ON returns FOR SELECT
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
          AND user_project_access.project_id = returns.project_id
        )
      );
  END IF;
END $$;