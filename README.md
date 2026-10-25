# Трекер привычек

Простое PWA-приложение для ежедневных привычек: разовые и с повторами за день, серии, история с графиками,
свои типы привычек, архив. Работает без интернета и ставится на iPhone, Android и компьютер.

Сборка не нужна — это статический сайт (`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`).

## Синхронизация между устройствами (необязательно)

1. Создайте проект на [supabase.com](https://supabase.com) и выполните `supabase-setup.sql` в SQL Editor.
2. Впишите Project URL и публичный ключ (anon / publishable) в `config.js`. Ключ `service_role` / `secret` туда вписывать нельзя.
3. В Authentication → URL Configuration добавьте адрес этого сайта в Site URL и Redirect URLs.

Пока `config.js` пустой, данные хранятся только в браузере на устройстве.

## Напоминания (push-уведомления)

1. Выполните `supabase-push.sql` в SQL Editor.
2. Создайте Edge Function `send-reminders` с кодом из `supabase/functions/send-reminders/index.ts` и выключите у неё проверку JWT.
3. Добавьте секреты функции: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
4. Запланируйте вызов функции каждые 5 минут через `pg_cron` с заголовком `x-cron-secret`.
5. Публичный VAPID-ключ впишите в `config.js` (`vapidPublicKey`).

На iPhone уведомления работают только в приложении, добавленном на экран «Домой» (iOS 16.4+).

`demo-data.json` — пример данных за год для проверки (кнопка «Импорт» внизу приложения).
