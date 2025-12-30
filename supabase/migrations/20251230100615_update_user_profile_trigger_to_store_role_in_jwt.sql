/*
  # Оновлення тригера створення користувача для збереження ролі в JWT

  1. Зміни
    - Оновити функцію handle_new_user щоб зберігати роль в app_metadata
    - Це дозволить політикам RLS використовувати роль з JWT без рекурсії

  2. Безпека
    - app_metadata недоступна для зміни користувачем
    - Тільки тригер може встановлювати роль
*/

-- Оновити функцію для збереження ролі в JWT
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_role text := 'customer';
BEGIN
  -- Створити профіль користувача
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, user_role);
  
  -- Зберегти роль в app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', user_role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
