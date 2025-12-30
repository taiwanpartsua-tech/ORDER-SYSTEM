/*
  # Виправлення нескінченної рекурсії в RLS політиках user_profiles

  1. Зміни
    - Видалити існуючі політики які використовують user_profiles всередині перевірок
    - Створити нові політики що використовують auth.jwt() для перевірки ролі
    - Це усуває рекурсію, оскільки роль зберігається в JWT токені

  2. Безпека
    - Роль зберігається в raw_app_metadata і недоступна для зміни користувачем
    - Політики залишаються такими ж захищеними
*/

-- Видалити всі існуючі політики для user_profiles
DROP POLICY IF EXISTS "Super admin can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Створити нові політики без рекурсії
CREATE POLICY "Super admin can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role')::text,
      ''
    ) = 'super_admin'
  );

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admin can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role')::text,
      ''
    ) = 'super_admin'
  );

CREATE POLICY "Super admin can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role')::text,
      ''
    ) = 'super_admin'
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role')::text,
      ''
    ) = 'super_admin'
  );

CREATE POLICY "Users can update own profile basic info"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT up.role FROM user_profiles up WHERE up.id = auth.uid())
  );

-- Видалити рекурсивні політики для audit_logs
DROP POLICY IF EXISTS "Super admin can view all logs" ON audit_logs;

CREATE POLICY "Super admin can view all logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role')::text,
      ''
    ) = 'super_admin'
  );
