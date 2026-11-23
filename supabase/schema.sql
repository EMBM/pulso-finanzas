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


-- Registro privado para deduplicar los correos automáticos del scheduler.
-- Las cuentas ordinarias jamás tienen acceso a esta tabla: solo la clave
-- administrativa guardada en los secretos del proceso del servidor.
create table if not exists public.reminder_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  send_date date not null,
  status text not null default 'sending' check (status in ('sending','sent')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (user_id, send_date)
);
alter table public.reminder_deliveries enable row level security;
revoke all on public.reminder_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.reminder_deliveries to service_role;
