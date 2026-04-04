create extension if not exists pgcrypto;

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null default 'active',
  expires_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null default auth.uid()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS gifts_set_updated_at ON public.gifts;
create trigger gifts_set_updated_at
before update on public.gifts
for each row
execute function public.set_updated_at();

alter table public.gifts enable row level security;

DROP POLICY IF EXISTS "public can read active gifts" ON public.gifts;
create policy "public can read active gifts"
on public.gifts
for select
to anon, authenticated
using (
  (status = 'active' and expires_at > now())
  or auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "public can create gifts" ON public.gifts;
create policy "public can create gifts"
on public.gifts
for insert
to anon, authenticated
with check (true);

DROP POLICY IF EXISTS "authenticated can update gifts" ON public.gifts;
create policy "authenticated can update gifts"
on public.gifts
for update
to authenticated
using (true)
with check (true);

DROP POLICY IF EXISTS "authenticated can delete gifts" ON public.gifts;
create policy "authenticated can delete gifts"
on public.gifts
for delete
to authenticated
using (true);
