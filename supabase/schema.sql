-- Pulso Finanzas: ejecutar en Supabase SQL Editor una sola vez.
-- Cada usuario autenticado solo puede leer o modificar su propia fila.
create table if not exists public.finance_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.finance_data enable row level security;

-- No permitir consultas de visitantes anónimos.
revoke all on table public.finance_data from anon;
revoke all on table public.finance_data from authenticated;
grant select, insert, update, delete on table public.finance_data to authenticated;

-- Evitar políticas antiguas demasiado generales al actualizar un proyecto existente.
drop policy if exists "Own data only" on public.finance_data;
drop policy if exists "finance_select_own" on public.finance_data;
drop policy if exists "finance_insert_own" on public.finance_data;
drop policy if exists "finance_update_own" on public.finance_data;
drop policy if exists "finance_delete_own" on public.finance_data;

create policy "finance_select_own" on public.finance_data
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "finance_insert_own" on public.finance_data
  for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "finance_update_own" on public.finance_data
  for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "finance_delete_own" on public.finance_data
  for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
