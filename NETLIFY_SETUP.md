# Налаштування Netlify для Supabase

## Проблема
Якщо ви бачите помилку "TypeError: Failed to fetch", це означає що змінні середовища не налаштовані.

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
- **Value:** `https://wjlerozqitvmtaqjgalo.supabase.co`

### Змінна 2:
- **Key:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGVyb3pxaXR2bXRhcWpnYWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDUxMDksImV4cCI6MjA4MTAyMTEwOX0.uuqBhkGU72VjF-TvQ98PQVV0Q8v_6Cm6zV3hkYdtXMU`

4. **Важливо:** Після додавання змінних, натисніть кнопку **"Redeploy"** або зробіть новий commit, щоб перебудувати сайт з новими змінними.

5. Після перебудови відкрийте консоль браузера (F12) і перезавантажте сторінку. Ви повинні побачити:
   ```
   Supabase Config: { url: "https://wjlerozqitv...", key: "eyJhbGciOiJIUzI1NiIs...", ... }
   ```

6. Якщо все налаштовано правильно, функція додавання замовлення буде працювати.

## Діагностика

Після оновлення сайту:
1. Натисніть F12 для відкриття консолі
2. Перезавантажте сторінку
3. Перегляньте перші повідомлення в консолі - там буде інформація про конфігурацію Supabase
4. Спробуйте додати замовлення - в консолі будуть детальні логи кожного кроку
