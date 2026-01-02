/*
  # Система архівування історії дій

  1. Нові таблиці
    - `archived_audit_logs`
      - Така ж структура як audit_logs
      - Зберігає архівні дані (старше 30 днів)
      - Автоматично очищається через 6 місяців

  2. Функції
    - `archive_old_audit_logs()` - переміщує логи старше 30 днів в архів
    - `cleanup_archived_logs()` - видаляє архівні логи старше 6 місяців
    - `get_user_audit_history()` - отримує всю історію користувача (активна + архівна)

  3. Безпека
    - RLS політики для archived_audit_logs аналогічні audit_logs
    - Super admin може бачити всі архівні логи
    - Користувачі можуть бачити тільки свої архівні логи
*/

-- Створення таблиці архівних логів
CREATE TABLE IF NOT EXISTS archived_audit_logs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL,
  archived_at timestamptz DEFAULT now()
);

-- Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_archived_audit_logs_user_id ON archived_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_archived_audit_logs_created_at ON archived_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_audit_logs_archived_at ON archived_audit_logs(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_audit_logs_entity ON archived_audit_logs(entity_type, entity_id);

-- Увімкнути RLS
ALTER TABLE archived_audit_logs ENABLE ROW LEVEL SECURITY;

-- Політики для archived_audit_logs
CREATE POLICY "Super admin can view all archived logs"
  ON archived_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view own archived logs"
  ON archived_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert archived logs"
  ON archived_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can delete old archived logs"
  ON archived_audit_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Функція для архівування логів старше 30 днів
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS TABLE (archived_count bigint) AS $$
DECLARE
  count_archived bigint;
BEGIN
  -- Переміщуємо логи старше 30 днів в архів
  WITH moved_logs AS (
    INSERT INTO archived_audit_logs (
      id, user_id, action, entity_type, entity_id, details, ip_address, created_at
    )
    SELECT 
      id, user_id, action, entity_type, entity_id, details, ip_address, created_at
    FROM audit_logs
    WHERE created_at < now() - INTERVAL '30 days'
    RETURNING id
  ),
  deleted_logs AS (
    DELETE FROM audit_logs
    WHERE id IN (SELECT id FROM moved_logs)
    RETURNING id
  )
  SELECT COUNT(*) INTO count_archived FROM moved_logs;
  
  RETURN QUERY SELECT count_archived;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функція для видалення архівних логів старше 6 місяців
CREATE OR REPLACE FUNCTION cleanup_archived_logs()
RETURNS TABLE (deleted_count bigint) AS $$
DECLARE
  count_deleted bigint;
BEGIN
  -- Видаляємо архівні логи старше 6 місяців
  WITH deleted AS (
    DELETE FROM archived_audit_logs
    WHERE archived_at < now() - INTERVAL '6 months'
    RETURNING id
  )
  SELECT COUNT(*) INTO count_deleted FROM deleted;
  
  RETURN QUERY SELECT count_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функція для отримання повної історії користувача (активна + архівна)
CREATE OR REPLACE FUNCTION get_user_audit_history(
  target_user_id uuid DEFAULT NULL,
  limit_count int DEFAULT 100,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  action text,
  entity_type text,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz,
  is_archived boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.action,
    al.entity_type,
    al.entity_id,
    al.details,
    al.ip_address,
    al.created_at,
    false as is_archived
  FROM audit_logs al
  WHERE (target_user_id IS NULL OR al.user_id = target_user_id)
  
  UNION ALL
  
  SELECT 
    aal.id,
    aal.user_id,
    aal.action,
    aal.entity_type,
    aal.entity_id,
    aal.details,
    aal.ip_address,
    aal.created_at,
    true as is_archived
  FROM archived_audit_logs aal
  WHERE (target_user_id IS NULL OR aal.user_id = target_user_id)
  
  ORDER BY created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функція для отримання статистики архівування
CREATE OR REPLACE FUNCTION get_audit_stats()
RETURNS TABLE (
  active_logs_count bigint,
  archived_logs_count bigint,
  oldest_active_log timestamptz,
  oldest_archived_log timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM audit_logs) as active_logs_count,
    (SELECT COUNT(*) FROM archived_audit_logs) as archived_logs_count,
    (SELECT MIN(created_at) FROM audit_logs) as oldest_active_log,
    (SELECT MIN(created_at) FROM archived_audit_logs) as oldest_archived_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;