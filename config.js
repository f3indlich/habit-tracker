// Подключение к Supabase. Оба значения берутся в Supabase → Project Settings → API Keys / Data API.
// Пока поля пустые, трекер работает как раньше — только на этом устройстве, без входа.
//
//  supabaseUrl — "Project URL", вида https://abcdefghijklmnop.supabase.co
//  supabaseKey — публичный ключ: "anon public" (eyJ…) или "publishable" (sb_publishable_…).
//                НИКОГДА не вставляйте сюда "service_role" / "secret" ключ.
window.HABIT_CONFIG = {
  supabaseUrl: 'https://twgxewleqqmkzlzvrcev.supabase.co/rest/v1/',
  supabaseKey: 'sb_publishable_GE4vUyzZS7jTjLOoBGkuCg_gBEyxnNX',
};
