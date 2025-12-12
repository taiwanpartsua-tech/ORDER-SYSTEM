# Налаштування Netlify для Supabase

## Проблема
Якщо на production сайт показує **білий екран** або помилку "TypeError: Failed to fetch", це означає що змінні середовища не налаштовані в Netlify.

## Локальна розробка

Якщо ви працюєте локально (npm run dev):
1. Переконайтеся що файл `.env` існує в корені проекту
2. Перезапустіть dev-сервер: зупиніть (Ctrl+C) і запустіть знову `npm run dev`
3. Змінні середовища завантажуються тільки при старті dev-сервера

## Розгортання на Netlify

1. Перейдіть до вашого сайту на Netlify
2. Відкрийте: **Site configuration → Environment variables**
3. Додайте дві змінні:

### Змінна 1:
- **Key:** `VITE_SUPABASE_URL`
- **Value:** `https://nzycllwwkizjbpxpozzq.supabase.co`

### Змінна 2:
- **Key:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eWNsbHd3a2l6amJweHBvenpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzU2MTksImV4cCI6MjA4MTExMTYxOX0.Zgk3-PyJhvZEIn3EszSD1mAl_HD-i6Go9qwCl7IrxvM`

4. **Важливо:** Після додавання змінних, натисніть кнопку **"Redeploy"** або зробіть новий commit, щоб перебудувати сайт з новими змінними.

5. Після перебудови відкрийте консоль браузера (F12) і перезавантажте сторінку. Ви повинні побачити:
   ```
   Supabase Config: { url: "https://nzycllwwkizj...", key: "eyJhbGciOiJIUzI1NiIs...", ... }
   ```

6. Якщо все налаштовано правильно, функція додавання замовлення буде працювати.

## Діагностика

Після оновлення сайту:
1. Натисніть F12 для відкриття консолі
2. Перезавантажте сторінку
3. Перегляньте перші повідомлення в консолі - там буде інформація про конфігурацію Supabase
4. Спробуйте додати замовлення - в консолі будуть детальні логи кожного кроку
