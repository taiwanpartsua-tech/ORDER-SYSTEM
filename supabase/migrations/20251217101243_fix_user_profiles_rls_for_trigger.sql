/*
  # Виправлення RLS політик для створення профілів через тригер
  
  1. Зміни
    - Додати політику для service_role, щоб тригер міг створювати профілі
    - Додати політику для автентифікованих користувачів при першому створенні
  
  2. Безпека
    - Service role може створювати профілі (для тригерів)
    - Інші політики залишаються без змін
*/

-- Додати політику для service role (використовується тригерами)
CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Дозволити автентифікованим користувачам оновлювати профілі через service role
CREATE POLICY "Service role can update profiles"
  ON user_profiles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);