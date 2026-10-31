-- Удаление своего аккаунта из приложения (кнопка «Удалить аккаунт» в настройках).
-- Функция удаляет текущего пользователя из auth.users. Внешние ключи с on delete cascade
-- удаляют вместе с ним все его строки в habit_data, push_subscriptions и push_log.
-- Выполнить один раз: Supabase → SQL Editor → вставить этот файл → Run.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
