/*
  # Оновлення тригера створення профілю користувача
  
  1. Зміни
    - Оновити функцію handle_new_user() для використання метаданих користувача
    - Тепер full_name буде автоматично заповнюватися з raw_user_meta_data
  
  2. Безпека
    - Функція виконується з правами SECURITY DEFINER для створення профілю
    - RLS політики залишаються без змін
*/

-- Оновлення функції для автоматичного створення профілю при реєстрації
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;