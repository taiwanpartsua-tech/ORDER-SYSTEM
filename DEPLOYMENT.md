# Інструкція по розгортанню на Netlify

## Налаштування Environment Variables

Щоб застосунок працював на Netlify, необхідно налаштувати змінні середовища:

1. Відкрийте ваш сайт в [Netlify Dashboard](https://app.netlify.com)
2. Перейдіть до `Site settings` → `Environment variables`
3. Натисніть `Add a variable`
4. Додайте наступні змінні:

### VITE_SUPABASE_URL
```
https://ispdojgvhdxemuqktupw.supabase.co
```

### VITE_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzcGRvamd2aGR4ZW11cWt0dXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MTk2NDQsImV4cCI6MjA4MDk5NTY0NH0.bW_y9QITwiJH8hifbQluTUuNRe_p9jCBVjd-Z2Itv9U
```

5. Збережіть зміни
6. Перейдіть до `Deploys` → `Trigger deploy` → `Deploy site`

## Перевірка

Після додавання змінних та перезапуску deploy, сайт повинен працювати коректно. Якщо все ще бачите білий екран, перевірте:

1. Чи додані всі змінні правильно (без пробілів на початку/кінці)
2. Чи завершився deploy успішно
3. Відкрийте консоль браузера (F12) та перевірте, чи є помилки

## Що було виправлено

### Проблема з білим екраном
- Додано Error Boundary для відображення помилок
- Покращено обробку відсутніх змінних середовища

### Проблема з "Failed to fetch"
- Виправлено RLS (Row Level Security) політики в базі даних
- Всі таблиці тепер доступні для анонімних користувачів
- База даних працює без аутентифікації

## Автоматичний Deploy

Netlify автоматично створює новий deploy при кожному push в git репозиторій.
