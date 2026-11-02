-- Ограничение размера данных одного пользователя в public.habit_data: не больше 5 МБ (5 242 880 байт).
-- Запись больше лимита отклоняется с ошибкой check_violation (23514) и текстом habit_data_size_limit.
-- Приложение распознаёт эту ошибку (isSizeError в js/sync.js), оставляет данные на устройстве и показывает подсказку.
--
-- Выполнить один раз: Supabase → SQL Editor → вставить весь файл → Run. Повторный запуск безопасен.
--
-- Перед включением посмотреть самые большие строки:
--   select user_id, octet_length(data::text) as bytes, pg_size_pretty(octet_length(data::text)::bigint) as size
--   from public.habit_data order by bytes desc limit 10;
--
-- Проверить, что триггер установлен:
--   select trigger_name, event_manipulation, action_timing
--   from information_schema.triggers
--   where event_object_schema = 'public' and event_object_table = 'habit_data' and trigger_name = 'habit_data_size_check';

create or replace function public.habit_data_size_check()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  size bigint := octet_length(new.data::text);
begin
  if size > 5242880 then
    raise exception using
      errcode = 'check_violation',
      message = 'habit_data_size_limit',
      detail = format('habit_data_size_limit: %s bytes, limit 5242880', size);
  end if;
  return new;
end;
$$;

drop trigger if exists habit_data_size_check on public.habit_data;

create trigger habit_data_size_check
  before insert or update on public.habit_data
  for each row execute function public.habit_data_size_check();
